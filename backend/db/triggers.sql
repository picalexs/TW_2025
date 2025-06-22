-- Drop all triggers in your database
DROP TRIGGER trg_users_before_insert;
DROP TRIGGER trg_favorites_counter;
DROP TRIGGER trg_adoption_status_log;
DROP TRIGGER trg_animal_metrics_init;
DROP TRIGGER trg_adoption_request_counter;
DROP TRIGGER trg_adoption_status_intelligence;
DROP TRIGGER trg_animal_popularity_tracker;
DROP TRIGGER trg_care_schedule_notifications;
DROP TRIGGER trg_security_audit;
DROP TRIGGER trg_notification_cleanup;
COMMIT;


CREATE OR REPLACE TRIGGER trg_users_before_insert
    BEFORE INSERT ON users
    FOR EACH ROW
DECLARE
    v_count_username NUMBER;
    v_count_email NUMBER;
BEGIN
    SELECT COUNT(*)
    INTO v_count_username
    FROM users
    WHERE UPPER(TRIM(username)) = UPPER(TRIM(:NEW.username));

    IF v_count_username > 0 THEN
        RAISE_APPLICATION_ERROR(-20001, 'Username already exists.');
    END IF;

    SELECT COUNT(*)
    INTO v_count_email
    FROM users
    WHERE UPPER(TRIM(email)) = UPPER(TRIM(:NEW.email));

    IF v_count_email > 0 THEN
        RAISE_APPLICATION_ERROR(-20002, 'Email address already exists.');
    END IF;

    IF :NEW.created_at IS NULL THEN
        :NEW.created_at := CURRENT_TIMESTAMP;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_favorites_counter
    AFTER INSERT OR DELETE ON favorites
    FOR EACH ROW
DECLARE
    v_animal_id NUMBER;
    v_error_message VARCHAR2(1000);
BEGIN
    IF INSERTING THEN
        v_animal_id := :NEW.animal_id;
        
        MERGE INTO animal_metrics am
        USING (SELECT :NEW.animal_id as animal_id FROM dual) src
        ON (am.animal_id = src.animal_id)
        WHEN MATCHED THEN
            UPDATE SET 
                favorites_count = favorites_count + 1,
                last_updated = CURRENT_TIMESTAMP
        WHEN NOT MATCHED THEN
            INSERT (animal_id, favorites_count, views_count, adoption_requests_count, last_updated)
            VALUES (src.animal_id, 1, 0, 0, CURRENT_TIMESTAMP);
            
    ELSE
        v_animal_id := :OLD.animal_id;
        UPDATE animal_metrics 
        SET favorites_count = GREATEST(favorites_count - 1, 0),
            last_updated = CURRENT_TIMESTAMP
        WHERE animal_id = v_animal_id;
    END IF;
EXCEPTION    
    WHEN DUP_VAL_ON_INDEX THEN
        IF INSERTING THEN
            UPDATE animal_metrics 
            SET favorites_count = favorites_count + 1,
                last_updated = CURRENT_TIMESTAMP
            WHERE animal_id = v_animal_id;
        END IF;
    WHEN OTHERS THEN
        v_error_message := SQLERRM;
        BEGIN
            INSERT INTO system_logs (
                log_type, action, details
            ) VALUES (
                'error',
                'favorites_counter_error',
                'Error updating favorites count for animal ' || v_animal_id || ': ' || v_error_message
            );
        EXCEPTION
            WHEN OTHERS THEN
                NULL; -- Ignore logging errors
        END;
END;
/

CREATE OR REPLACE TRIGGER trg_adoption_status_log
    AFTER UPDATE OF status ON adoptions
    FOR EACH ROW
BEGIN
    INSERT INTO adoption_status_history (
        adoption_id, old_status, new_status, 
        changed_by, changed_at
    ) VALUES (
        :NEW.id, :OLD.status, :NEW.status, 
        NULL, CURRENT_TIMESTAMP
    );
    
    IF :NEW.status = 'completed' AND :OLD.status != 'completed' THEN
        UPDATE animals 
        SET adoption_status = 'adopted'
        WHERE id = :NEW.animal_id;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_animal_metrics_init
    AFTER INSERT ON animals
    FOR EACH ROW
BEGIN
    MERGE INTO animal_metrics am
    USING (SELECT :NEW.id as animal_id FROM dual) src
    ON (am.animal_id = src.animal_id)
    WHEN NOT MATCHED THEN
        INSERT (animal_id, favorites_count, views_count, adoption_requests_count, last_updated)
        VALUES (:NEW.id, 0, 0, 0, CURRENT_TIMESTAMP);
EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN
        NULL;
END;
/

CREATE OR REPLACE TRIGGER trg_adoption_request_counter
    AFTER INSERT ON adoptions
    FOR EACH ROW
DECLARE
    v_error_message VARCHAR2(1000);
BEGIN
    MERGE INTO animal_metrics am
    USING (SELECT :NEW.animal_id as animal_id FROM dual) src
    ON (am.animal_id = src.animal_id)
    WHEN MATCHED THEN
        UPDATE SET 
            adoption_requests_count = adoption_requests_count + 1,
            last_updated = CURRENT_TIMESTAMP
    WHEN NOT MATCHED THEN
        INSERT (animal_id, favorites_count, views_count, adoption_requests_count, last_updated)
        VALUES (src.animal_id, 0, 0, 1, CURRENT_TIMESTAMP);
EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN
        UPDATE animal_metrics 
        SET adoption_requests_count = adoption_requests_count + 1,
            last_updated = CURRENT_TIMESTAMP
        WHERE animal_id = :NEW.animal_id;
    WHEN OTHERS THEN
        v_error_message := SQLERRM;
        BEGIN
            INSERT INTO system_logs (
                log_type, action, details
            ) VALUES (
                'error',
                'adoption_request_counter_error',
                'Error updating adoption request count for animal ' || :NEW.animal_id || ': ' || v_error_message
            );
        EXCEPTION
            WHEN OTHERS THEN
                NULL; -- Ignore logging errors
        END;
END;
/

CREATE OR REPLACE TRIGGER trg_adoption_status_intelligence
    FOR INSERT OR UPDATE OR DELETE ON adoptions
    COMPOUND TRIGGER

    TYPE t_adoption_data IS RECORD (
        animal_id NUMBER,
        user_id NUMBER,
        adoption_id NUMBER,
        old_status VARCHAR2(50),
        new_status VARCHAR2(50),
        operation VARCHAR2(10)
    );
    
    TYPE t_adoption_collection IS TABLE OF t_adoption_data;
    l_adoptions t_adoption_collection := t_adoption_collection();
    
    PROCEDURE create_notification(
        p_user_id NUMBER,
        p_type VARCHAR2,
        p_title VARCHAR2,
        p_message CLOB,
        p_priority VARCHAR2 DEFAULT 'normal'
    ) IS      BEGIN
        INSERT INTO system_notifications (
            user_id, notification_type, title, message, 
            priority_level
        ) VALUES (
            p_user_id, p_type, p_title, p_message,
            p_priority
        );
    END create_notification;
    
    PROCEDURE handle_auto_rejections(p_animal_id NUMBER, p_approved_adoption_id NUMBER, p_animal_name VARCHAR2) IS
        v_rejected_count NUMBER := 0;
    BEGIN
        FOR pending_adoption IN (
            SELECT id, user_id 
            FROM adoptions 
            WHERE animal_id = p_animal_id 
            AND id != p_approved_adoption_id 
            AND status = 'pending'
        ) LOOP
            UPDATE adoptions 
            SET status = 'rejected' 
            WHERE id = pending_adoption.id;
            
            create_notification(
                pending_adoption.user_id,
                'adoption_update',
                'Adoption Request Update',
                'Unfortunately, your adoption request for ' || p_animal_name || 
                ' was not selected. The pet has been adopted by another family.',
                'normal'
            );
            
            v_rejected_count := v_rejected_count + 1;
        END LOOP;        
          INSERT INTO system_logs (
            log_type, action, details
        ) VALUES (
            'system_event',
            'auto_reject_adoptions',
            'Auto-rejected ' || v_rejected_count || ' pending adoptions for animal ID: ' || p_animal_id
        );
    END handle_auto_rejections;

    BEFORE EACH ROW IS
        v_pending_count NUMBER;
        v_animal_name VARCHAR2(100);
    BEGIN
        IF INSERTING THEN
            SELECT COUNT(*) INTO v_pending_count
            FROM adoptions 
            WHERE user_id = :NEW.user_id 
            AND status = 'pending';
            
            IF v_pending_count > 3 THEN
                RAISE_APPLICATION_ERROR(-20003, 'User cannot have more than 3 pending adoption requests.');
            END IF;
            
            l_adoptions.EXTEND;
            l_adoptions(l_adoptions.COUNT).animal_id := :NEW.animal_id;
            l_adoptions(l_adoptions.COUNT).user_id := :NEW.user_id;
            l_adoptions(l_adoptions.COUNT).adoption_id := :NEW.id;
            l_adoptions(l_adoptions.COUNT).new_status := :NEW.status;
            l_adoptions(l_adoptions.COUNT).operation := 'INSERT';
            
        ELSIF UPDATING THEN
            l_adoptions.EXTEND;
            l_adoptions(l_adoptions.COUNT).animal_id := :NEW.animal_id;
            l_adoptions(l_adoptions.COUNT).user_id := :NEW.user_id;
            l_adoptions(l_adoptions.COUNT).adoption_id := :NEW.id;
            l_adoptions(l_adoptions.COUNT).old_status := :OLD.status;
            l_adoptions(l_adoptions.COUNT).new_status := :NEW.status;
            l_adoptions(l_adoptions.COUNT).operation := 'UPDATE';
            
        ELSIF DELETING THEN
            l_adoptions.EXTEND;
            l_adoptions(l_adoptions.COUNT).animal_id := :OLD.animal_id;
            l_adoptions(l_adoptions.COUNT).user_id := :OLD.user_id;
            l_adoptions(l_adoptions.COUNT).adoption_id := :OLD.id;
            l_adoptions(l_adoptions.COUNT).operation := 'DELETE';
        END IF;
    END BEFORE EACH ROW;

    AFTER STATEMENT IS
        v_animal_name VARCHAR2(100);
        v_notification_title VARCHAR2(200);
        v_notification_message CLOB;
        v_priority_level VARCHAR2(20);
        v_error_message VARCHAR2(1000);
    BEGIN
        FOR i IN 1..l_adoptions.COUNT LOOP
            BEGIN
                SELECT name INTO v_animal_name 
                FROM animals 
                WHERE id = l_adoptions(i).animal_id;
                
                IF l_adoptions(i).operation = 'INSERT' THEN
                    create_notification(
                        l_adoptions(i).user_id,
                        'adoption_submitted',
                        'Adoption Request Submitted',
                        'Your adoption request for ' || v_animal_name || ' has been submitted successfully. We will review it soon.',
                        'normal'
                    );
                    
                ELSIF l_adoptions(i).operation = 'UPDATE' AND 
                      l_adoptions(i).old_status != l_adoptions(i).new_status THEN
                    
                    CASE l_adoptions(i).new_status
                        WHEN 'approved' THEN
                            v_notification_title := 'Adoption Request Approved!';
                            v_notification_message := 'Great news! Your adoption request for ' || v_animal_name || ' has been approved.';
                            v_priority_level := 'high';
                            handle_auto_rejections(l_adoptions(i).animal_id, l_adoptions(i).adoption_id, v_animal_name);
                        WHEN 'rejected' THEN
                            v_notification_title := 'Adoption Request Update';
                            v_notification_message := 'We regret to inform you that your adoption request for ' || v_animal_name || ' could not be approved at this time.';
                            v_priority_level := 'normal';
                        WHEN 'completed' THEN
                            v_notification_title := 'Adoption Completed!';
                            v_notification_message := 'Congratulations! You have successfully completed the adoption of ' || v_animal_name || '. Welcome to your new family member!';
                            v_priority_level := 'high';
                            
                            UPDATE animals 
                            SET adoption_status = 'adopted' 
                            WHERE id = l_adoptions(i).animal_id;
                        ELSE
                            v_notification_title := 'Adoption Status Update';
                            v_notification_message := 'The status of your adoption request for ' || v_animal_name || ' has been updated to: ' || l_adoptions(i).new_status;
                            v_priority_level := 'normal';
                    END CASE;
                    
                    IF v_notification_title IS NOT NULL THEN
                        create_notification(
                            l_adoptions(i).user_id,
                            'adoption_update',
                            v_notification_title,
                            v_notification_message,
                            v_priority_level
                        );
                    END IF;
                    
                ELSIF l_adoptions(i).operation = 'DELETE' THEN
                    INSERT INTO system_logs (
                        log_type, action, details
                    ) VALUES (
                        'user_action', 'adoption_request_cancelled', 
                        'User ID: ' || l_adoptions(i).user_id || ', Animal ID: ' || l_adoptions(i).animal_id
                    );
                END IF;

            EXCEPTION
                WHEN OTHERS THEN
                    v_error_message := SQLERRM;
                    BEGIN
                        INSERT INTO system_logs (
                            log_type, action, details
                        ) VALUES (
                            'error',
                            'trigger_error_adoption_intelligence',
                            'Error processing adoption ' || l_adoptions(i).adoption_id || ': ' || v_error_message
                        );
                    EXCEPTION
                        WHEN OTHERS THEN
                            NULL;
                    END;
            END;
        END LOOP;
        
        l_adoptions.DELETE;
    EXCEPTION
        WHEN OTHERS THEN
            v_error_message := SQLERRM;
            BEGIN
                INSERT INTO system_logs (
                    log_type, action, details
                ) VALUES (
                    'error',
                    'trigger_error_adoption_intelligence_statement',
                    'Error in adoption trigger statement processing: ' || v_error_message
                );
            EXCEPTION
                WHEN OTHERS THEN
                    NULL; -- Ignore logging errors
            END;
            l_adoptions.DELETE;
            RAISE;
    END AFTER STATEMENT;

END trg_adoption_status_intelligence;
/

CREATE OR REPLACE TRIGGER trg_animal_popularity_tracker
    AFTER INSERT OR UPDATE ON animal_metrics
    FOR EACH ROW
DECLARE
    v_popularity_score NUMBER := 0;
    v_trend VARCHAR2(20) := 'stable';
    v_previous_score NUMBER := 0;
BEGIN
    v_popularity_score := (:NEW.favorites_count * 3) + 
                         (:NEW.views_count) + 
                         (:NEW.adoption_requests_count * 5);
    IF UPDATING THEN
        v_previous_score := (:OLD.favorites_count * 3) + 
                           (:OLD.views_count) + 
                           (:OLD.adoption_requests_count * 5);
        
        IF v_popularity_score > v_previous_score * 1.2 THEN
            v_trend := 'rising';
        ELSIF v_popularity_score < v_previous_score * 0.8 THEN
            v_trend := 'falling';
        ELSE
            v_trend := 'stable';
        END IF;
    END IF;
      IF v_trend != 'stable' THEN        
        INSERT INTO system_logs (
            log_type, animal_id, action, details
        ) VALUES (
            'system_event',
            :NEW.animal_id,
            'popularity_trend_change',
            'Animal popularity trend changed to: ' || v_trend || ' (score: ' || v_popularity_score || ')'
        );
    END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_care_schedule_notifications
AFTER INSERT OR UPDATE ON care_schedule
FOR EACH ROW
DECLARE
    v_animal_name VARCHAR2(100);
    v_shelter_id NUMBER;
    v_notification_message VARCHAR2(500);
    v_error_message VARCHAR2(1000);
BEGIN
    BEGIN
        SELECT name, shelter_id 
        INTO v_animal_name, v_shelter_id
        FROM animals 
        WHERE id = :NEW.animal_id;

        v_notification_message := 'Care schedule updated for ' || v_animal_name || 
                                  ': ' || :NEW.activity || ' at ' || :NEW.hour ||
                                  ' (' || :NEW.frequency || ')';        
        IF v_shelter_id IS NOT NULL THEN
            INSERT INTO system_notifications (
                user_id, notification_type, title, message, priority_level
            ) VALUES (
                v_shelter_id,
                'care_schedule',
                'Care Schedule Update',
                v_notification_message,
                'normal'
            );
        END IF;

    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            NULL;      
        WHEN OTHERS THEN
            v_error_message := SQLERRM;
            BEGIN
                INSERT INTO system_logs (
                    log_type, action, details
                ) VALUES (
                    'error',
                    'care_schedule_notification_error',
                    'Error creating care schedule notification: ' || v_error_message
                );
            EXCEPTION
                WHEN OTHERS THEN
                    NULL;
            END;
    END;
END;
/

CREATE OR REPLACE TRIGGER trg_security_audit
    AFTER UPDATE ON users
    FOR EACH ROW
DECLARE
    v_changes CLOB := '';
    v_session_info VARCHAR2(200);
    v_ip_address VARCHAR2(45);
    v_session_user VARCHAR2(100);
BEGIN
    IF :OLD.email != :NEW.email THEN
        v_changes := v_changes || 'Email changed from ' || :OLD.email || ' to ' || :NEW.email || '; ';
    END IF;
    
    IF :OLD.password_hash != :NEW.password_hash THEN
        v_changes := v_changes || 'Password changed; ';
    END IF;
    
    IF :OLD.role != :NEW.role THEN
        v_changes := v_changes || 'Role changed from ' || :OLD.role || ' to ' || :NEW.role || '; ';
    END IF;
    
    IF LENGTH(v_changes) > 0 THEN
        BEGIN
            v_ip_address := SYS_CONTEXT('USERENV', 'IP_ADDRESS');
            IF v_ip_address IS NULL THEN
                v_ip_address := SYS_CONTEXT('USERENV', 'HOST');
            END IF;
            IF v_ip_address IS NULL THEN
                v_ip_address := 'unknown';
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                v_ip_address := 'unavailable';
        END;
        
        BEGIN
            v_session_user := SYS_CONTEXT('USERENV', 'SESSION_USER');
            IF v_session_user IS NULL THEN
                v_session_user := USER;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                v_session_user := 'unknown';
        END;
        
        v_session_info := v_session_user || ' from IP: ' || v_ip_address;        
        INSERT INTO system_logs (
            log_type, user_id, action, details
        ) VALUES (
            'security',
            :NEW.id,
            'user_profile_update',
            'User profile updated: ' || v_changes || ' Session: ' || v_session_info
        );
    END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_notification_cleanup
    AFTER INSERT ON system_notifications
    FOR EACH ROW
DECLARE
    v_old_count NUMBER;
    v_user_id NUMBER;
    v_cleanup_count NUMBER;
BEGIN
    v_user_id := :NEW.user_id;
    
    SELECT COUNT(*) INTO v_old_count
    FROM system_notifications
    WHERE user_id = v_user_id
    AND created_at < SYSDATE - 30;
    
    IF v_old_count > 100 THEN
        DELETE FROM system_notifications
        WHERE user_id = v_user_id
        AND created_at < SYSDATE - 30
        AND ROWNUM <= (v_old_count - 100);
        
        v_cleanup_count := SQL%ROWCOUNT;          
        INSERT INTO system_logs (
            log_type, user_id, action, details
        ) VALUES (
            'system_event',
            v_user_id,
            'notification_cleanup',
            'Cleaned up ' || v_cleanup_count || ' old notifications'
        );
    END IF;
END;
/