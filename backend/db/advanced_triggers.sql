
CREATE OR REPLACE TRIGGER trg_adoption_status_intelligence
    AFTER INSERT OR UPDATE OR DELETE ON adoptions
    FOR EACH ROW
DECLARE
    v_pet_id NUMBER;
    v_user_id NUMBER;
    v_old_status VARCHAR2(50);
    v_new_status VARCHAR2(50);
    v_pending_count NUMBER;
    v_notification_title VARCHAR2(200);
    v_notification_message CLOB;
    v_priority_level VARCHAR2(20) := 'normal';
    
    -- Custom exceptions
    e_too_many_pending EXCEPTION;
    PRAGMA EXCEPTION_INIT(e_too_many_pending, -20001);
    
    -- Helper procedure for creating notifications
    PROCEDURE create_notification(
        p_user_id NUMBER,
        p_type VARCHAR2,
        p_title VARCHAR2,
        p_message CLOB,
        p_priority VARCHAR2 DEFAULT 'normal',
        p_entity_type VARCHAR2 DEFAULT 'adoption',
        p_entity_id NUMBER DEFAULT NULL
    ) IS
    BEGIN
        INSERT INTO system_notifications (
            user_id, notification_type, title, message, 
            priority_level, related_entity_type, related_entity_id
        ) VALUES (
            p_user_id, p_type, p_title, p_message,
            p_priority, p_entity_type, p_entity_id
        );
    END create_notification;
    
    -- Procedure to handle auto-rejection logic
    PROCEDURE handle_auto_rejections(p_animal_id NUMBER, p_approved_adoption_id NUMBER) IS
        v_rejected_count NUMBER := 0;
    BEGIN
        -- Auto-reject all other pending adoptions for the same animal
        FOR pending_adoption IN (
            SELECT id, user_id 
            FROM adoptions 
            WHERE animal_id = p_animal_id 
            AND id != p_approved_adoption_id 
            AND status = 'pending'
        ) LOOP
            -- Update status to auto-rejected
            UPDATE adoptions 
            SET status = 'auto_rejected',
                status_changed_at = CURRENT_TIMESTAMP,
                rejection_reason = 'Animal was adopted by another applicant'
            WHERE id = pending_adoption.id;
            
            -- Create notification for rejected user
            create_notification(
                pending_adoption.user_id,
                'adoption_rejected',
                'Adoption Request Auto-Rejected',
                'Unfortunately, your adoption request was automatically rejected because the animal was adopted by another applicant. Please browse our other available pets.',
                'high',
                'adoption',
                pending_adoption.id
            );
            
            v_rejected_count := v_rejected_count + 1;
        END LOOP;
        
        -- Log the auto-rejection activity
        INSERT INTO system_logs (log_level, category, message, created_at)
        VALUES ('INFO', 'adoption_automation', 
               'Auto-rejected ' || v_rejected_count || ' pending adoptions for animal ' || p_animal_id,
               CURRENT_TIMESTAMP);
    END handle_auto_rejections;
    
BEGIN
    -- Determine the operation and extract relevant data
    IF INSERTING THEN
        v_pet_id := :NEW.animal_id;
        v_user_id := :NEW.user_id;
        v_new_status := :NEW.status;
        v_old_status := NULL;
    ELSIF UPDATING THEN
        v_pet_id := :NEW.animal_id;
        v_user_id := :NEW.user_id;
        v_old_status := :OLD.status;
        v_new_status := :NEW.status;
    ELSIF DELETING THEN
        v_pet_id := :OLD.animal_id;
        v_user_id := :OLD.user_id;
        v_old_status := :OLD.status;
        v_new_status := NULL;
    END IF;
    
    -- Log status change in history table (for INSERT and UPDATE)
    IF NOT DELETING THEN
        INSERT INTO adoption_status_history (
            adoption_id, old_status, new_status, changed_at
        ) VALUES (
            :NEW.id, v_old_status, v_new_status, CURRENT_TIMESTAMP
        );
    END IF;
    
    -- Handle different status transitions
    IF v_new_status = 'approved' AND (v_old_status != 'approved' OR v_old_status IS NULL) THEN
        -- Approval logic
        
        -- Update animal status to adopted
        UPDATE animals 
        SET adoption_status = 'adopted',
            adopted_at = CURRENT_TIMESTAMP
        WHERE id = v_pet_id;
        
        -- Handle auto-rejections
        handle_auto_rejections(v_pet_id, :NEW.id);
        
        -- Create success notification for approved user
        SELECT name INTO v_notification_title FROM animals WHERE id = v_pet_id;
        v_notification_message := 'Congratulations! Your adoption request for ' || v_notification_title || 
                                 ' has been approved. Please contact us to arrange pickup.';
        
        create_notification(
            v_user_id,
            'adoption_approved',
            'Adoption Request Approved!',
            v_notification_message,
            'high',
            'adoption',
            :NEW.id
        );
        
        -- Update animal metrics
        UPDATE animal_metrics 
        SET adoption_requests_count = adoption_requests_count + 1,
            last_updated = CURRENT_TIMESTAMP
        WHERE animal_id = v_pet_id;
        
    ELSIF v_new_status = 'rejected' AND v_old_status = 'pending' THEN
        -- Rejection logic
        
        create_notification(
            v_user_id,
            'adoption_rejected',
            'Adoption Request Decision',
            'Your adoption request has been reviewed. Unfortunately, we cannot proceed with your application at this time. ' ||
            COALESCE(:NEW.rejection_reason, 'Please feel free to apply for other available pets.'),
            'normal',
            'adoption',
            :NEW.id
        );
        
    ELSIF v_new_status = 'pending' AND INSERTING THEN
        -- New pending application logic
        
        -- Check if user has too many pending applications
        SELECT COUNT(*) INTO v_pending_count
        FROM adoptions 
        WHERE user_id = v_user_id 
        AND status = 'pending';
        
        IF v_pending_count > 3 THEN
            RAISE_APPLICATION_ERROR(-20001, 
                'User cannot have more than 3 pending adoption requests. Please wait for current applications to be processed.');
        END IF;
        
        -- Check if animal is still available
        DECLARE
            v_animal_status VARCHAR2(50);
        BEGIN
            SELECT adoption_status INTO v_animal_status 
            FROM animals WHERE id = v_pet_id;
            
            IF v_animal_status != 'available' THEN
                RAISE_APPLICATION_ERROR(-20002, 
                    'This animal is no longer available for adoption.');
            END IF;
        END;
        
        -- Create confirmation notification
        SELECT name INTO v_notification_title FROM animals WHERE id = v_pet_id;
        v_notification_message := 'Thank you for your interest in adopting ' || v_notification_title || 
                                 '. Your application has been received and is being reviewed. We will contact you soon.';
        
        create_notification(
            v_user_id,
            'adoption_submitted',
            'Adoption Application Received',
            v_notification_message,
            'normal',
            'adoption',
            :NEW.id
        );
        
        -- Update animal metrics
        MERGE INTO animal_metrics am
        USING (SELECT v_pet_id as animal_id FROM DUAL) src
        ON (am.animal_id = src.animal_id)
        WHEN MATCHED THEN
            UPDATE SET 
                adoption_requests_count = adoption_requests_count + 1,
                last_updated = CURRENT_TIMESTAMP
        WHEN NOT MATCHED THEN
            INSERT (animal_id, adoption_requests_count, last_updated)
            VALUES (src.animal_id, 1, CURRENT_TIMESTAMP);
    END IF;
    
    -- Log the trigger execution
    INSERT INTO system_logs (log_level, category, message, user_id, created_at)
    VALUES ('INFO', 'adoption_trigger', 
           'Processed adoption status change: ' || COALESCE(v_old_status, 'NULL') || 
           ' -> ' || COALESCE(v_new_status, 'NULL') || ' for animal ' || v_pet_id,
           v_user_id, CURRENT_TIMESTAMP);

EXCEPTION
    WHEN e_too_many_pending THEN
        RAISE;
    WHEN OTHERS THEN
        -- Log error and re-raise
        INSERT INTO system_logs (log_level, category, message, user_id, created_at)
        VALUES ('ERROR', 'adoption_trigger', 
               'Error in adoption trigger: ' || SQLERRM || ' for animal ' || v_pet_id,
               v_user_id, CURRENT_TIMESTAMP);
        RAISE;
END;
/

-- =====================================================
-- TRIGGER 2: DYNAMIC ANIMAL METRICS AND RECOMMENDATIONS UPDATE
-- =====================================================

CREATE OR REPLACE TRIGGER trg_animal_metrics_automation
    AFTER INSERT OR UPDATE OR DELETE ON favorites
    FOR EACH ROW
DECLARE
    v_animal_id NUMBER;
    v_user_id NUMBER;
    v_favorites_count NUMBER;
    v_views_count NUMBER;
    v_popularity_score NUMBER;
    v_recommendation_boost NUMBER := 0;
    
    -- Variables for smart recommendations
    v_similar_animals_cursor SYS_REFCURSOR;
    v_similar_animal_id NUMBER;
    
    PROCEDURE update_animal_popularity(p_animal_id NUMBER) IS
        v_total_interactions NUMBER;
        v_recent_interactions NUMBER;
        v_adoption_success_rate NUMBER;
        v_final_score NUMBER;
    BEGIN
        -- Calculate comprehensive popularity score
        SELECT 
            NVL(favorites_count, 0) + NVL(views_count, 0) * 0.1,
            NVL(adoption_requests_count, 0)
        INTO v_total_interactions, v_recent_interactions
        FROM animal_metrics 
        WHERE animal_id = p_animal_id;
        
        -- Calculate adoption success rate
        SELECT 
            CASE 
                WHEN COUNT(*) = 0 THEN 0.5 -- Default neutral score
                ELSE COUNT(CASE WHEN status = 'approved' THEN 1 END) / COUNT(*) 
            END
        INTO v_adoption_success_rate
        FROM adoptions 
        WHERE animal_id = p_animal_id;
        
        -- Calculate final popularity score (0-100)
        v_final_score := LEAST(100, 
            (v_total_interactions * 0.4) + 
            (v_recent_interactions * 0.3) + 
            (v_adoption_success_rate * 30)
        );
        
        -- Update or create animal metrics
        MERGE INTO animal_metrics am
        USING (SELECT p_animal_id as animal_id, v_final_score as pop_score FROM DUAL) src
        ON (am.animal_id = src.animal_id)
        WHEN MATCHED THEN
            UPDATE SET 
                last_updated = CURRENT_TIMESTAMP
        WHEN NOT MATCHED THEN
            INSERT (animal_id, last_updated)
            VALUES (src.animal_id, CURRENT_TIMESTAMP);
            
        -- Log significant popularity changes
        IF v_final_score > 80 THEN
            INSERT INTO system_logs (log_level, category, message, created_at)
            VALUES ('INFO', 'popularity_tracking', 
                   'High popularity detected for animal ' || p_animal_id || 
                   ' (score: ' || ROUND(v_final_score, 1) || ')',
                   CURRENT_TIMESTAMP);
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            INSERT INTO system_logs (log_level, category, message, created_at)
            VALUES ('ERROR', 'popularity_calculation', 
                   'Error updating popularity for animal ' || p_animal_id || ': ' || SQLERRM,
                   CURRENT_TIMESTAMP);
    END update_animal_popularity;
    
    PROCEDURE refresh_user_recommendations(p_user_id NUMBER, p_triggered_by_animal NUMBER) IS
        v_refresh_count NUMBER := 0;
    BEGIN
        -- Refresh compatibility scores for user based on their new favorite
        FOR similar_pet IN (
            SELECT DISTINCT a.id
            FROM animals a
            JOIN animals trigger_animal ON (
                a.species = trigger_animal.species OR
                a.size = trigger_animal.size OR
                ABS(a.age - trigger_animal.age) <= 2
            )
            WHERE trigger_animal.id = p_triggered_by_animal
            AND a.id != p_triggered_by_animal
            AND a.adoption_status = 'available'
            AND ROWNUM <= 10  -- Limit to avoid performance issues
        ) LOOP
            -- Trigger recalculation of compatibility score
            DECLARE
                v_dummy_score NUMBER;
            BEGIN
                v_dummy_score := pet_matching_engine.calculate_compatibility(p_user_id, similar_pet.id);
                v_refresh_count := v_refresh_count + 1;
            EXCEPTION
                WHEN OTHERS THEN
                    NULL; -- Continue with other pets if one fails
            END;
        END LOOP;
        
        IF v_refresh_count > 0 THEN
            INSERT INTO system_logs (log_level, category, message, user_id, created_at)
            VALUES ('INFO', 'recommendation_refresh', 
                   'Refreshed recommendations for ' || v_refresh_count || ' similar pets',
                   p_user_id, CURRENT_TIMESTAMP);
        END IF;
    END refresh_user_recommendations;
    
BEGIN
    -- Determine the affected animal and user
    IF INSERTING OR UPDATING THEN
        v_animal_id := :NEW.animal_id;
        v_user_id := :NEW.user_id;
    ELSIF DELETING THEN
        v_animal_id := :OLD.animal_id;
        v_user_id := :OLD.user_id;
    END IF;
    
    -- Update favorites count
    SELECT COUNT(*) INTO v_favorites_count
    FROM favorites 
    WHERE animal_id = v_animal_id;
    
    -- Update animal metrics
    MERGE INTO animal_metrics am
    USING (SELECT v_animal_id as animal_id, v_favorites_count as fav_count FROM DUAL) src
    ON (am.animal_id = src.animal_id)
    WHEN MATCHED THEN
        UPDATE SET 
            favorites_count = src.fav_count,
            last_updated = CURRENT_TIMESTAMP
    WHEN NOT MATCHED THEN
        INSERT (animal_id, favorites_count, last_updated)
        VALUES (src.animal_id, src.fav_count, CURRENT_TIMESTAMP);
    
    -- Update overall popularity score
    update_animal_popularity(v_animal_id);
    
    -- For new favorites, refresh user recommendations
    IF INSERTING THEN
        refresh_user_recommendations(v_user_id, v_animal_id);
        
        -- Create notification for high-interest animals
        IF v_favorites_count >= 5 THEN
            DECLARE
                v_animal_name VARCHAR2(100);
            BEGIN
                SELECT name INTO v_animal_name FROM animals WHERE id = v_animal_id;
                
                -- Notify animal owner/shelter about high interest
                INSERT INTO system_notifications (
                    user_id, notification_type, title, message, priority_level,
                    related_entity_type, related_entity_id
                )
                SELECT 
                    u.id,
                    'high_interest_alert',
                    'High Interest in Your Pet',
                    v_animal_name || ' is getting a lot of attention! (' || v_favorites_count || ' favorites)',
                    'normal',
                    'animal',
                    v_animal_id
                FROM animals a
                JOIN users u ON a.owner_id = u.id
                WHERE a.id = v_animal_id;
            END;
        END IF;
    END IF;
    
    -- Log the metrics update
    INSERT INTO system_logs (log_level, category, message, user_id, created_at)
    VALUES ('DEBUG', 'metrics_update', 
           'Updated metrics for animal ' || v_animal_id || ': ' || v_favorites_count || ' favorites',
           v_user_id, CURRENT_TIMESTAMP);

EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO system_logs (log_level, category, message, user_id, created_at)
        VALUES ('ERROR', 'metrics_trigger', 
               'Error in animal metrics trigger: ' || SQLERRM || ' for animal ' || v_animal_id,
               v_user_id, CURRENT_TIMESTAMP);
END;
/

-- =====================================================
-- TRIGGER 3: AUTOMATED CARE SCHEDULE OPTIMIZATION
-- =====================================================

CREATE OR REPLACE TRIGGER trg_care_schedule_optimization
    AFTER INSERT OR UPDATE ON pet_care_schedules
    FOR EACH ROW
DECLARE
    v_optimization_needed NUMBER(1) := 0;
    v_schedule_efficiency NUMBER;
    v_conflict_count NUMBER;
BEGIN
    -- Check if optimization is needed
    IF INSERTING OR (:OLD.frequency_count != :NEW.frequency_count OR 
                     :OLD.preferred_time_start != :NEW.preferred_time_start OR
                     :OLD.duration_minutes != :NEW.duration_minutes) THEN
        v_optimization_needed := 1;
    END IF;
    
    IF v_optimization_needed = 1 THEN
        -- Trigger schedule optimization for the next 7 days
        FOR i IN 0..6 LOOP
            DECLARE
                v_target_date DATE := TRUNC(SYSDATE) + i;
                v_schedule_cursor SYS_REFCURSOR;
            BEGIN
                -- Clear existing optimized schedule for this date
                DELETE FROM optimized_schedules 
                WHERE pet_id = :NEW.pet_id 
                AND schedule_date = v_target_date;
                
                -- Generate new optimized schedule
                FOR schedule_rec IN (
                    SELECT * FROM TABLE(care_schedule_optimizer.optimize_daily_schedule(:NEW.pet_id, v_target_date))
                ) LOOP
                    NULL; -- The optimization function handles the inserts
                END LOOP;
                
                -- Resolve any conflicts
                care_schedule_optimizer.resolve_schedule_conflicts(:NEW.pet_id, v_target_date);
                
            EXCEPTION
                WHEN OTHERS THEN
                    INSERT INTO system_logs (log_level, category, message, created_at)
                    VALUES ('ERROR', 'schedule_optimization', 
                           'Failed to optimize schedule for pet ' || :NEW.pet_id || 
                           ' on ' || TO_CHAR(v_target_date, 'YYYY-MM-DD') || ': ' || SQLERRM,
                           CURRENT_TIMESTAMP);
            END;
        END LOOP;
        
        -- Log the optimization trigger
        INSERT INTO system_logs (log_level, category, message, created_at)
        VALUES ('INFO', 'schedule_automation', 
               'Triggered schedule optimization for pet ' || :NEW.pet_id || ' for next 7 days',
               CURRENT_TIMESTAMP);
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO system_logs (log_level, category, message, created_at)
        VALUES ('ERROR', 'schedule_trigger', 
               'Error in care schedule trigger: ' || SQLERRM || ' for pet ' || :NEW.pet_id,
               CURRENT_TIMESTAMP);
END;
/
