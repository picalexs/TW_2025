
--user validation
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
    
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

--favorites counter
CREATE OR REPLACE TRIGGER trg_favorites_counter
    AFTER INSERT OR DELETE ON favorites
    FOR EACH ROW
DECLARE
    v_animal_id NUMBER;
    v_count NUMBER;
BEGIN
    IF INSERTING THEN
        v_animal_id := :NEW.animal_id;
    ELSE
        v_animal_id := :OLD.animal_id;
    END IF;

    SELECT COUNT(*)
    INTO v_count
    FROM favorites
    WHERE animal_id = v_animal_id;

    UPDATE animal_metrics 
    SET favorites_count = v_count,
        last_favorited = CASE WHEN INSERTING THEN CURRENT_TIMESTAMP ELSE last_favorited END,
        updated_at = CURRENT_TIMESTAMP
    WHERE animal_id = v_animal_id;
    
    IF SQL%ROWCOUNT = 0 THEN
        INSERT INTO animal_metrics (animal_id, favorites_count, last_favorited, updated_at)
        VALUES (v_animal_id, v_count, CASE WHEN INSERTING THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP);
    END IF;
END;
/

--adoption status log
CREATE OR REPLACE TRIGGER trg_adoption_status_log
    AFTER UPDATE OF status ON adoptions
    FOR EACH ROW
BEGIN
    INSERT INTO adoption_status_log (
        adoption_id, old_status, new_status, 
        changed_by, changed_at
    ) VALUES (
        :NEW.id, :OLD.status, :NEW.status, 
        :NEW.processed_by, CURRENT_TIMESTAMP
    );
    
    IF :NEW.status = 'completed' AND :OLD.status != 'completed' THEN
        UPDATE animals 
        SET adoption_status = 'adopted', 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :NEW.animal_id;
    END IF;
END;
/

--animal metrics initialization
CREATE OR REPLACE TRIGGER trg_animal_metrics_init
    AFTER INSERT ON animals
    FOR EACH ROW
BEGIN
    INSERT INTO animal_metrics (
        animal_id, 
        favorites_count, 
        views_count, 
        adoption_requests_count,
        popularity_trend,
        avg_compatibility_score,
        urgency_level,
        updated_at
    ) VALUES (
        :NEW.id,
        0,
        0,
        0,
        'stable',
        0,
        CASE WHEN :NEW.is_urgent = 1 THEN 'high' ELSE 'normal' END,
        CURRENT_TIMESTAMP
    );
END;
/

--auto-update timestamps
CREATE OR REPLACE TRIGGER trg_users_update_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_animals_update_timestamp
    BEFORE UPDATE ON animals
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_adoptions_update_timestamp
    BEFORE UPDATE ON adoptions
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

--adoption request counter
CREATE OR REPLACE TRIGGER trg_adoption_request_counter
    AFTER INSERT ON adoptions
    FOR EACH ROW
BEGIN
    UPDATE animal_metrics
    SET adoption_requests_count = adoption_requests_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE animal_id = :NEW.animal_id;
END;
/

--adoption notification
CREATE OR REPLACE TRIGGER trg_adoption_notification
    AFTER INSERT OR UPDATE OF status ON adoptions
    FOR EACH ROW
DECLARE
    v_animal_name VARCHAR2(100);
    v_notification_title VARCHAR2(200);
    v_notification_message VARCHAR2(1000);
    v_priority VARCHAR2(20) := 'normal';
BEGIN
    SELECT name INTO v_animal_name FROM animals WHERE id = :NEW.animal_id;
    
    IF INSERTING THEN
        v_notification_title := 'New Adoption Request Submitted';
        v_notification_message := 'You have submitted an adoption request for ' || v_animal_name || 
                              '. We will review your application soon.';
    ELSIF UPDATING AND :OLD.status != :NEW.status THEN
        CASE :NEW.status
            WHEN 'approved' THEN
                v_notification_title := 'Adoption Request Approved';
                v_notification_message := 'Your adoption request for ' || v_animal_name || 
                                      ' has been approved.';
                v_priority := 'high';
            
            WHEN 'rejected' THEN
                v_notification_title := 'Adoption Request Update';
                v_notification_message := 'Your adoption request for ' || v_animal_name || 
                                      ' could not be approved at this time.';
            
            WHEN 'completed' THEN
                v_notification_title := 'Adoption Completed';
                v_notification_message := 'Congratulations on completing the adoption of ' || v_animal_name || '!';
                v_priority := 'high';
            
            ELSE
                v_notification_title := 'Adoption Status Update';
                v_notification_message := 'The status of your adoption request for ' || v_animal_name || 
                                      ' has been updated to: ' || :NEW.status;
        END CASE;
    END IF;
    
    IF v_notification_title IS NOT NULL THEN
        INSERT INTO notifications (
            user_id, title, message, category, priority, created_at
        ) VALUES (
            :NEW.user_id, v_notification_title, v_notification_message, 
            'adoption', v_priority, CURRENT_TIMESTAMP
        );
    END IF;
END;
/ 