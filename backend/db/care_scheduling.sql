-- =====================================================
-- CARE SCHEDULING PACKAGE
-- =====================================================

CREATE OR REPLACE PACKAGE care_scheduling_pkg AS
    -- Generate care schedule for a pet
    FUNCTION generate_care_schedule(
        p_animal_id NUMBER,
        p_start_date DATE DEFAULT SYSDATE,
        p_days NUMBER DEFAULT 30
    ) RETURN SYS_REFCURSOR;
    
    -- Create a specific care task
    PROCEDURE create_care_task(
        p_animal_id NUMBER,
        p_task_type VARCHAR2,
        p_description VARCHAR2,
        p_scheduled_time TIMESTAMP,
        p_frequency VARCHAR2 DEFAULT NULL,
        p_priority VARCHAR2 DEFAULT 'normal'
    );
    
    -- Mark a care task as completed
    PROCEDURE complete_care_task(
        p_task_id NUMBER,
        p_completed_by NUMBER,
        p_notes VARCHAR2 DEFAULT NULL
    );
    
    -- Reschedule a recurring task
    PROCEDURE reschedule_task(
        p_task_id NUMBER
    );
    
    -- Get upcoming care tasks for an animal
    FUNCTION get_upcoming_tasks(
        p_animal_id NUMBER,
        p_days NUMBER DEFAULT 7
    ) RETURN SYS_REFCURSOR;
END care_scheduling_pkg;
/

CREATE OR REPLACE PACKAGE BODY care_scheduling_pkg AS
    
    -- Generate care schedule for a pet
    FUNCTION generate_care_schedule(
        p_animal_id NUMBER,
        p_start_date DATE DEFAULT SYSDATE,
        p_days NUMBER DEFAULT 30
    ) RETURN SYS_REFCURSOR IS
        v_result SYS_REFCURSOR;
        v_species VARCHAR2(50);
        v_age_years NUMBER;
        v_health_status VARCHAR2(255);
        v_special_needs CLOB;
        v_feeding_freq NUMBER;
        v_exercise_freq NUMBER;
        v_grooming_freq NUMBER;
        v_checkup_needed BOOLEAN := FALSE;
        v_end_date DATE := p_start_date + p_days;
    BEGIN
        -- Get animal details
        SELECT 
            species,
            age_years,
            health_status,
            special_needs
        INTO 
            v_species,
            v_age_years,
            v_health_status,
            v_special_needs
        FROM 
            animals
        WHERE 
            id = p_animal_id;
            
        -- Determine care frequencies based on species and age
        IF v_species = 'Dog' THEN
            -- Feeding frequency
            IF v_age_years < 1 THEN
                v_feeding_freq := 3; -- 3 times daily for puppies
            ELSE
                v_feeding_freq := 2; -- 2 times daily for adult dogs
            END IF;
            
            -- Exercise frequency
            v_exercise_freq := 2; -- 2 times daily
            
            -- Grooming frequency (in days)
            v_grooming_freq := 7; -- Weekly
        ELSIF v_species = 'Cat' THEN
            -- Feeding frequency
            IF v_age_years < 1 THEN
                v_feeding_freq := 3; -- 3 times daily for kittens
            ELSE
                v_feeding_freq := 2; -- 2 times daily for adult cats
            END IF;
            
            -- Exercise frequency
            v_exercise_freq := 1; -- 1 time daily
            
            -- Grooming frequency (in days)
            v_grooming_freq := 3; -- 2-3 times weekly
        ELSE
            -- Default values for other species
            v_feeding_freq := 2;
            v_exercise_freq := 1;
            v_grooming_freq := 7;
        END IF;
        
        -- Check if medical checkup is needed
        IF v_health_status LIKE '%needs checkup%' OR INSTR(v_special_needs, 'medical') > 0 THEN
            v_checkup_needed := TRUE;
        END IF;
        
        -- Create feeding schedule
        FOR i IN 0..p_days-1 LOOP
            FOR j IN 1..v_feeding_freq LOOP
                create_care_task(
                    p_animal_id => p_animal_id,
                    p_task_type => 'feeding',
                    p_description => 'Regular feeding',
                    p_scheduled_time => TO_TIMESTAMP(TO_CHAR(p_start_date + i, 'YYYY-MM-DD') || 
                                              ' ' || 
                                              CASE 
                                                  WHEN j = 1 THEN '08:00:00'
                                                  WHEN j = 2 THEN '17:00:00'
                                                  WHEN j = 3 THEN '13:00:00'
                                              END, 
                                              'YYYY-MM-DD HH24:MI:SS'),
                    p_frequency => 'daily',
                    p_priority => 'high'
                );
            END LOOP;
        END LOOP;
        
        -- Create exercise schedule
        FOR i IN 0..p_days-1 LOOP
            FOR j IN 1..v_exercise_freq LOOP
                create_care_task(
                    p_animal_id => p_animal_id,
                    p_task_type => 'exercise',
                    p_description => 'Regular exercise/playtime',
                    p_scheduled_time => TO_TIMESTAMP(TO_CHAR(p_start_date + i, 'YYYY-MM-DD') || 
                                              ' ' || 
                                              CASE 
                                                  WHEN j = 1 THEN '10:00:00'
                                                  WHEN j = 2 THEN '16:00:00'
                                              END, 
                                              'YYYY-MM-DD HH24:MI:SS'),
                    p_frequency => 'daily',
                    p_priority => 'medium'
                );
            END LOOP;
        END LOOP;
        
        -- Create grooming schedule
        FOR i IN 0..p_days-1 LOOP
            IF MOD(i, v_grooming_freq) = 0 THEN
                create_care_task(
                    p_animal_id => p_animal_id,
                    p_task_type => 'grooming',
                    p_description => 'Regular grooming',
                    p_scheduled_time => TO_TIMESTAMP(TO_CHAR(p_start_date + i, 'YYYY-MM-DD') || ' 15:00:00', 
                                              'YYYY-MM-DD HH24:MI:SS'),
                    p_frequency => 'weekly',
                    p_priority => 'medium'
                );
            END IF;
        END LOOP;
        
        -- Create medical checkup if needed
        IF v_checkup_needed THEN
            create_care_task(
                p_animal_id => p_animal_id,
                p_task_type => 'medical',
                p_description => 'Veterinary checkup',
                p_scheduled_time => TO_TIMESTAMP(TO_CHAR(p_start_date + 7, 'YYYY-MM-DD') || ' 14:00:00', 
                                          'YYYY-MM-DD HH24:MI:SS'),
                p_frequency => 'once',
                p_priority => 'high'
            );
        END IF;
        
        -- Return schedule
        OPEN v_result FOR
            SELECT 
                id,
                animal_id,
                task_type,
                description,
                scheduled_time,
                frequency,
                priority_level,
                status
            FROM 
                care_schedule
            WHERE 
                animal_id = p_animal_id
                AND scheduled_time BETWEEN p_start_date AND v_end_date
            ORDER BY 
                scheduled_time;
                
        RETURN v_result;
    EXCEPTION
        WHEN OTHERS THEN
            -- Return empty cursor on error
            OPEN v_result FOR
                SELECT 
                    NULL AS id,
                    NULL AS animal_id,
                    NULL AS task_type,
                    'Error: ' || SQLERRM AS description,
                    NULL AS scheduled_time,
                    NULL AS frequency,
                    NULL AS priority_level,
                    NULL AS status
                FROM 
                    dual
                WHERE
                    1 = 0;
            RETURN v_result;
    END generate_care_schedule;
    
    -- Create a specific care task
    PROCEDURE create_care_task(
        p_animal_id NUMBER,
        p_task_type VARCHAR2,
        p_description VARCHAR2,
        p_scheduled_time TIMESTAMP,
        p_frequency VARCHAR2 DEFAULT NULL,
        p_priority VARCHAR2 DEFAULT 'normal'
    ) IS
    BEGIN
        INSERT INTO care_schedule (
            animal_id,
            task_type,
            description,
            scheduled_time,
            next_due_date,
            frequency,
            priority_level,
            status,
            created_at
        ) VALUES (
            p_animal_id,
            p_task_type,
            p_description,
            p_scheduled_time,
            CASE 
                WHEN p_frequency = 'daily' THEN p_scheduled_time + INTERVAL '1' DAY
                WHEN p_frequency = 'weekly' THEN p_scheduled_time + INTERVAL '7' DAY
                WHEN p_frequency = 'monthly' THEN ADD_MONTHS(p_scheduled_time, 1)
                ELSE NULL
            END,
            p_frequency,
            p_priority,
            'pending',
            CURRENT_TIMESTAMP
        );
    EXCEPTION
        WHEN OTHERS THEN
            -- Log error but don't fail
            INSERT INTO system_logs (
                log_type, 
                log_level,
                animal_id,
                action,
                details,
                created_at
            ) VALUES (
                'system_event',
                'ERROR',
                p_animal_id,
                'create_care_task',
                'Error creating care task: ' || SQLERRM,
                CURRENT_TIMESTAMP
            );
    END create_care_task;
    
    -- Mark a care task as completed
    PROCEDURE complete_care_task(
        p_task_id NUMBER,
        p_completed_by NUMBER,
        p_notes VARCHAR2 DEFAULT NULL
    ) IS
        v_frequency VARCHAR2(50);
        v_animal_id NUMBER;
        v_task_type VARCHAR2(50);
        v_description VARCHAR2(255);
        v_scheduled_time TIMESTAMP;
    BEGIN
        -- Update the task
        UPDATE care_schedule
        SET 
            status = 'completed',
            completion_time = CURRENT_TIMESTAMP,
            completed_by = p_completed_by,
            notes = p_notes
        WHERE 
            id = p_task_id
        RETURNING 
            frequency, animal_id, task_type, description, scheduled_time
        INTO 
            v_frequency, v_animal_id, v_task_type, v_description, v_scheduled_time;
            
        -- If it's a recurring task, schedule the next one
        IF v_frequency IN ('daily', 'weekly', 'monthly') THEN
            reschedule_task(p_task_id);
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log error but don't fail
            INSERT INTO system_logs (
                log_type, 
                log_level,
                action,
                details,
                created_at
            ) VALUES (
                'system_event',
                'ERROR',
                'complete_care_task',
                'Error completing care task: ' || SQLERRM,
                CURRENT_TIMESTAMP
            );
    END complete_care_task;
    
    -- Reschedule a recurring task
    PROCEDURE reschedule_task(
        p_task_id NUMBER
    ) IS
        v_frequency VARCHAR2(50);
        v_animal_id NUMBER;
        v_task_type VARCHAR2(50);
        v_description VARCHAR2(255);
        v_scheduled_time TIMESTAMP;
        v_priority VARCHAR2(20);
        v_next_time TIMESTAMP;
    BEGIN
        -- Get task details
        SELECT 
            frequency, 
            animal_id, 
            task_type, 
            description, 
            scheduled_time,
            priority_level
        INTO 
            v_frequency, 
            v_animal_id, 
            v_task_type, 
            v_description, 
            v_scheduled_time,
            v_priority
        FROM 
            care_schedule
        WHERE 
            id = p_task_id;
            
        -- Calculate next scheduled time
        CASE v_frequency
            WHEN 'daily' THEN
                v_next_time := v_scheduled_time + INTERVAL '1' DAY;
            WHEN 'weekly' THEN
                v_next_time := v_scheduled_time + INTERVAL '7' DAY;
            WHEN 'monthly' THEN
                v_next_time := ADD_MONTHS(v_scheduled_time, 1);
            ELSE
                v_next_time := NULL;
        END CASE;
        
        -- Create the next task if frequency is valid
        IF v_next_time IS NOT NULL THEN
            create_care_task(
                p_animal_id => v_animal_id,
                p_task_type => v_task_type,
                p_description => v_description,
                p_scheduled_time => v_next_time,
                p_frequency => v_frequency,
                p_priority => v_priority
            );
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log error but don't fail
            INSERT INTO system_logs (
                log_type, 
                log_level,
                action,
                details,
                created_at
            ) VALUES (
                'system_event',
                'ERROR',
                'reschedule_task',
                'Error rescheduling task: ' || SQLERRM,
                CURRENT_TIMESTAMP
            );
    END reschedule_task;
    
    -- Get upcoming care tasks for an animal
    FUNCTION get_upcoming_tasks(
        p_animal_id NUMBER,
        p_days NUMBER DEFAULT 7
    ) RETURN SYS_REFCURSOR IS
        v_result SYS_REFCURSOR;
    BEGIN
        OPEN v_result FOR
            SELECT 
                id,
                animal_id,
                task_type,
                description,
                scheduled_time,
                frequency,
                priority_level,
                status
            FROM 
                care_schedule
            WHERE 
                animal_id = p_animal_id
                AND status = 'pending'
                AND scheduled_time BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '1' DAY * p_days
            ORDER BY 
                scheduled_time, priority_level DESC;
                
        RETURN v_result;
    EXCEPTION
        WHEN OTHERS THEN
            -- Return empty cursor on error
            OPEN v_result FOR
                SELECT 
                    NULL AS id,
                    NULL AS animal_id,
                    NULL AS task_type,
                    'Error: ' || SQLERRM AS description,
                    NULL AS scheduled_time,
                    NULL AS frequency,
                    NULL AS priority_level,
                    NULL AS status
                FROM 
                    dual
                WHERE
                    1 = 0;
            RETURN v_result;
    END get_upcoming_tasks;
    
END care_scheduling_pkg;
/ 