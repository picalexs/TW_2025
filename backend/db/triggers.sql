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
    WHERE UPPER(username) = UPPER(:NEW.username);

    IF v_count_username > 0 THEN
        RAISE_APPLICATION_ERROR(-20001, 'Username already exists.');
    END IF;

    SELECT COUNT(*)
    INTO v_count_email
    FROM users
    WHERE UPPER(email) = UPPER(:NEW.email);

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
BEGIN
    IF INSERTING THEN
        v_animal_id := :NEW.animal_id;
        UPDATE animal_metrics 
        SET favorites_count = favorites_count + 1,
            last_updated = CURRENT_TIMESTAMP
        WHERE animal_id = v_animal_id;
        
        -- If no record exists, create one
        IF SQL%ROWCOUNT = 0 THEN
            INSERT INTO animal_metrics (
                animal_id, favorites_count, views_count, adoption_requests_count, last_updated
            ) VALUES (
                v_animal_id, 1, 0, 0, CURRENT_TIMESTAMP
            );
        END IF;
    ELSE
        v_animal_id := :OLD.animal_id;
        UPDATE animal_metrics 
        SET favorites_count = GREATEST(favorites_count - 1, 0),
            last_updated = CURRENT_TIMESTAMP
        WHERE animal_id = v_animal_id;
    END IF;
END;
/

--adoption status history trigger
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

--animal metrics initialization trigger
CREATE OR REPLACE TRIGGER trg_animal_metrics_init
    AFTER INSERT ON animals
    FOR EACH ROW
BEGIN
    INSERT INTO animal_metrics (
        animal_id, 
        favorites_count, 
        views_count, 
        adoption_requests_count,
        last_updated
    ) VALUES (
        :NEW.id,
        0,
        0,
        0,
        CURRENT_TIMESTAMP
    );
END;
/

CREATE OR REPLACE TRIGGER trg_adoption_request_counter
    AFTER INSERT ON adoptions
    FOR EACH ROW
BEGIN
    UPDATE animal_metrics
    SET adoption_requests_count = adoption_requests_count + 1,
        last_updated = CURRENT_TIMESTAMP
    WHERE animal_id = :NEW.animal_id;
END;
/


--adoption status management
CREATE OR REPLACE TRIGGER trg_adoption_status_intelligence
    AFTER INSERT OR UPDATE OR DELETE ON adoptions
    FOR EACH ROW
DECLARE
    v_animal_id NUMBER;
    v_user_id NUMBER;
    v_old_status VARCHAR2(50);
    v_new_status VARCHAR2(50);
    v_pending_count NUMBER;
    v_notification_title VARCHAR2(200);
    v_notification_message CLOB;
    v_priority_level VARCHAR2(20) := 'normal';
    v_animal_name VARCHAR2(100);
    v_adoption_id NUMBER;
    
    PROCEDURE create_notification(
        p_user_id NUMBER,
        p_type VARCHAR2,
        p_title VARCHAR2,
        p_message CLOB,
        p_priority VARCHAR2 DEFAULT 'normal'
    ) IS
    BEGIN
        INSERT INTO system_notifications (
            user_id, notification_type, title, message, 
            priority_level, created_at
        ) VALUES (
            p_user_id, p_type, p_title, p_message,
            p_priority, CURRENT_TIMESTAMP
        );
    END create_notification;
    
    PROCEDURE handle_auto_rejections(p_animal_id NUMBER, p_approved_adoption_id NUMBER) IS
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
                'Unfortunately, your adoption request for ' || v_animal_name || 
                ' was not selected. The pet has been adopted by another family.',
                'normal'
            );
            
            v_rejected_count := v_rejected_count + 1;
        END LOOP;
        
        INSERT INTO system_logs (
            log_type, action, details, created_at
        ) VALUES (
            'system_event',
            'auto_reject_adoptions',
            'Auto-rejected ' || v_rejected_count || ' pending adoptions for animal ID: ' || p_animal_id,
            CURRENT_TIMESTAMP
        );
    END handle_auto_rejections;

BEGIN
    IF INSERTING THEN
        v_animal_id := :NEW.animal_id;
        v_user_id := :NEW.user_id;
        v_new_status := :NEW.status;
        
        -- Fetch animal name once for all operations
        SELECT name INTO v_animal_name FROM animals WHERE id = v_animal_id;
        
        SELECT COUNT(*) INTO v_pending_count
        FROM adoptions 
        WHERE user_id = v_user_id 
        AND status = 'pending';
        
        IF v_pending_count > 3 THEN
            RAISE_APPLICATION_ERROR(-20003, 'User cannot have more than 3 pending adoption requests.');
        END IF;
        
        create_notification(
            v_user_id,
            'adoption_submitted',
            'Adoption Request Submitted',
            'Your adoption request for ' || v_animal_name || ' has been submitted successfully. We will review it soon.',
            'normal'
        );
        
    ELSIF UPDATING THEN
        v_animal_id := :NEW.animal_id;
        v_user_id := :NEW.user_id;
        v_old_status := :OLD.status;
        v_new_status := :NEW.status;
        v_adoption_id := :NEW.id;
        
        IF v_old_status != v_new_status THEN
            -- Fetch animal name once for all operations
            SELECT name INTO v_animal_name FROM animals WHERE id = v_animal_id;
            
            CASE v_new_status
                WHEN 'approved' THEN
                    v_notification_title := 'Adoption Request Approved!';
                    v_notification_message := 'Great news! Your adoption request for ' || v_animal_name || ' has been approved.';
                    v_priority_level := 'high';
                    handle_auto_rejections(v_animal_id, v_adoption_id);
                    
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
                    WHERE id = v_animal_id;
                    
                ELSE
                    v_notification_title := 'Adoption Status Update';
                    v_notification_message := 'The status of your adoption request for ' || v_animal_name || ' has been updated to: ' || v_new_status;
                    v_priority_level := 'normal';
            END CASE;
            
            IF v_notification_title IS NOT NULL THEN
                create_notification(
                    v_user_id,
                    'adoption_update',
                    v_notification_title,
                    v_notification_message,
                    v_priority_level
                );
            END IF;
        END IF;
        
    ELSIF DELETING THEN
        v_animal_id := :OLD.animal_id;
        v_user_id := :OLD.user_id;
        INSERT INTO system_logs (
            log_type, user_id, animal_id, action, created_at
        ) VALUES (
            'user_action', v_user_id, v_animal_id, 'adoption_request_cancelled', CURRENT_TIMESTAMP
        );
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO system_logs (
            log_type, action, details, created_at
        ) VALUES (
            'error',
            'trigger_error_adoption_intelligence',
            'Error in adoption trigger: ' || SQLERRM,
            CURRENT_TIMESTAMP
        );
        RAISE;
END;
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
            log_type, animal_id, action, details, created_at
        ) VALUES (
            'system_event',
            :NEW.animal_id,
            'popularity_trend_change',
            'Animal popularity trend changed to: ' || v_trend || ' (score: ' || v_popularity_score || ')',
            CURRENT_TIMESTAMP
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
    v_animal_id NUMBER;
    v_activity VARCHAR2(100);
    v_hour VARCHAR2(10);
    v_frequency VARCHAR2(50);
BEGIN
    v_animal_id := :NEW.animal_id;
    v_activity := :NEW.activity;
    v_hour := :NEW.hour;
    v_frequency := :NEW.frequency;
    
    SELECT name, shelter_id 
    INTO v_animal_name, v_shelter_id
    FROM animals 
    WHERE id = v_animal_id;
    
    v_notification_message := 'Care schedule updated for ' || v_animal_name || 
                             ': ' || v_activity || ' at ' || v_hour ||
                             ' (' || v_frequency || ')';
    
    INSERT INTO system_notifications (
        user_id, notification_type, title, message, priority_level, created_at
    ) VALUES (
        v_shelter_id,
        'care_schedule',
        'Care Schedule Update',
        v_notification_message,
        'normal',
        CURRENT_TIMESTAMP
    );
    
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        NULL;
    WHEN OTHERS THEN
        INSERT INTO system_logs (
            log_type, action, details, created_at
        ) VALUES (
            'error',
            'care_schedule_notification_error',
            'Error creating care schedule notification: ' || SQLERRM,
            CURRENT_TIMESTAMP
        );
END;
/

--security and audit trigger
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
        -- Get session info with fallbacks
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
            log_type, user_id, action, details, created_at
        ) VALUES (
            'security',
            :NEW.id,
            'user_profile_update',
            'User profile updated: ' || v_changes || ' Session: ' || v_session_info,
            CURRENT_TIMESTAMP
        );
    END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_users_update_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
BEGIN
    -- Auto-update timestamp on any user record change
    -- Note: updated_at doesn't exist in current schema, so this is placeholder
    NULL;
END;
/

CREATE OR REPLACE TRIGGER trg_animals_update_timestamp
    BEFORE UPDATE ON animals
    FOR EACH ROW
BEGIN
    -- Auto-update timestamp on any animal record change
    -- Note: updated_at doesn't exist in current schema, so this is placeholder
    NULL;
END;
/

CREATE OR REPLACE TRIGGER trg_adoptions_update_timestamp
    BEFORE UPDATE ON adoptions
    FOR EACH ROW
BEGIN
    -- Auto-update timestamp on any adoption record change
    -- Note: updated_at doesn't exist in current schema, so this is placeholder
    NULL;
END;
/

--automatic cleanup trigger for old notifications
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
            log_type, user_id, action, details, created_at
        ) VALUES (
            'system_event',
            v_user_id,
            'notification_cleanup',
            'Cleaned up ' || v_cleanup_count || ' old notifications',
            CURRENT_TIMESTAMP
        );
    END IF;
END;
/