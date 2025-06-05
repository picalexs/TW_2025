-- =====================================================
-- PET MATCHING ALGORITHM PACKAGE
-- =====================================================

CREATE OR REPLACE PACKAGE pet_matching_pkg AS
    -- Calculate compatibility score between user and animal
    FUNCTION calculate_compatibility_score(
        p_user_id NUMBER,
        p_animal_id NUMBER
    ) RETURN NUMBER;
    
    -- Get recommended pets for a user
    FUNCTION get_pet_recommendations(
        p_user_id NUMBER,
        p_limit NUMBER DEFAULT 10
    ) RETURN SYS_REFCURSOR;
    
    -- Log matching history
    PROCEDURE log_matching_interaction(
        p_user_id NUMBER,
        p_animal_id NUMBER,
        p_action VARCHAR2,
        p_score NUMBER DEFAULT NULL
    );
    
    -- Calculate distance between coordinates
    FUNCTION calculate_distance(
        p_lat1 NUMBER, p_lon1 NUMBER,
        p_lat2 NUMBER, p_lon2 NUMBER
    ) RETURN NUMBER;
END pet_matching_pkg;
/

CREATE OR REPLACE PACKAGE BODY pet_matching_pkg AS
    
    -- Calculate compatibility score between user and animal
    FUNCTION calculate_compatibility_score(
        p_user_id NUMBER,
        p_animal_id NUMBER
    ) RETURN NUMBER IS
        v_score NUMBER := 0;
        v_max_score NUMBER := 100;
        
        -- User preference data
        v_preferred_species CLOB;
        v_preferred_age VARCHAR2(50);
        v_preferred_size CLOB;
        v_activity_level VARCHAR2(20);
        v_home_type VARCHAR2(50);
        v_has_yard NUMBER(1);
        v_has_other_pets NUMBER(1);
        v_experience_level VARCHAR2(20);
        v_max_distance NUMBER;
        v_user_lat NUMBER;
        v_user_lng NUMBER;
        
        -- Animal data
        v_species VARCHAR2(50);
        v_age_years NUMBER;
        v_size_category VARCHAR2(20);
        v_energy_level VARCHAR2(20);
        v_good_with_pets NUMBER(1);
        v_special_needs CLOB;
        v_animal_lat NUMBER;
        v_animal_lng NUMBER;
        
        -- Scoring components
        v_species_score NUMBER := 0;
        v_age_score NUMBER := 0;
        v_size_score NUMBER := 0;
        v_energy_score NUMBER := 0;
        v_location_score NUMBER := 0;
        v_pets_score NUMBER := 0;
        v_special_needs_score NUMBER := 0;
        
        v_distance NUMBER;
        
    BEGIN
        -- Get user preferences
        BEGIN
            SELECT 
                up.preferred_species,
                up.preferred_age_range,
                up.preferred_size,
                up.activity_level,
                up.home_type,
                up.has_yard,
                up.has_other_pets,
                u.experience_level,
                up.max_distance,
                a.latitude,
                a.longitude
            INTO 
                v_preferred_species,
                v_preferred_age,
                v_preferred_size,
                v_activity_level,
                v_home_type,
                v_has_yard,
                v_has_other_pets,
                v_experience_level,
                v_max_distance,
                v_user_lat,
                v_user_lng
            FROM 
                user_preferences up
                JOIN users u ON up.user_id = u.id
                JOIN address a ON u.address_id = a.id
            WHERE 
                up.user_id = p_user_id;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                -- Default values if preferences not set
                v_preferred_species := '["any"]';
                v_preferred_age := 'any';
                v_preferred_size := '["any"]';
                v_activity_level := 'medium';
                v_home_type := 'house';
                v_has_yard := 0;
                v_has_other_pets := 0;
                v_experience_level := 'beginner';
                v_max_distance := 50;
        END;
        
        -- Get animal data
        SELECT 
            a.species,
            a.age_years,
            a.size_category,
            a.energy_level,
            a.good_with_pets,
            a.special_needs,
            ad.latitude,
            ad.longitude
        INTO 
            v_species,
            v_age_years,
            v_size_category,
            v_energy_level,
            v_good_with_pets,
            v_special_needs,
            v_animal_lat,
            v_animal_lng
        FROM 
            animals a
            LEFT JOIN address ad ON a.address_id = ad.id
        WHERE 
            a.id = p_animal_id;
            
        -- 1. Species match (20 points)
        IF v_preferred_species LIKE '%"any"%' OR v_preferred_species LIKE '%"' || LOWER(v_species) || '"%' THEN
            v_species_score := 20;
        END IF;
        
        -- 2. Age match (15 points)
        IF v_preferred_age = 'any' THEN
            v_age_score := 15;
        ELSIF v_preferred_age = 'young' AND v_age_years < 3 THEN
            v_age_score := 15;
        ELSIF v_preferred_age = 'adult' AND v_age_years BETWEEN 3 AND 8 THEN
            v_age_score := 15;
        ELSIF v_preferred_age = 'senior' AND v_age_years > 8 THEN
            v_age_score := 15;
        ELSE
            v_age_score := 5; -- Partial match
        END IF;
        
        -- 3. Size match (15 points)
        IF v_preferred_size LIKE '%"any"%' OR v_preferred_size LIKE '%"' || LOWER(v_size_category) || '"%' THEN
            v_size_score := 15;
        ELSE
            v_size_score := 5; -- Partial match
        END IF;
        
        -- 4. Energy level match (15 points)
        IF v_activity_level = v_energy_level THEN
            v_energy_score := 15;
        ELSIF (v_activity_level = 'high' AND v_energy_level = 'medium') OR
              (v_activity_level = 'medium' AND v_energy_level IN ('low', 'high')) THEN
            v_energy_score := 10;
        ELSE
            v_energy_score := 5;
        END IF;
        
        -- 5. Location proximity (15 points)
        IF v_user_lat IS NOT NULL AND v_animal_lat IS NOT NULL THEN
            v_distance := calculate_distance(v_user_lat, v_user_lng, v_animal_lat, v_animal_lng);
            
            IF v_distance <= 10 THEN
                v_location_score := 15;
            ELSIF v_distance <= v_max_distance THEN
                v_location_score := 15 * (1 - (v_distance / v_max_distance));
            ELSE
                v_location_score := 0;
            END IF;
        ELSE
            v_location_score := 5; -- Unknown location
        END IF;
        
        -- 6. Pet compatibility (10 points)
        IF v_has_other_pets = 0 OR (v_has_other_pets = 1 AND v_good_with_pets = 1) THEN
            v_pets_score := 10;
        ELSE
            v_pets_score := 0;
        END IF;
        
        -- 7. Special needs match (10 points)
        IF v_special_needs IS NULL OR LENGTH(v_special_needs) <= 2 THEN -- No special needs
            v_special_needs_score := 10;
        ELSIF v_experience_level = 'expert' THEN
            v_special_needs_score := 10;
        ELSIF v_experience_level = 'intermediate' THEN
            v_special_needs_score := 7;
        ELSE
            v_special_needs_score := 3;
        END IF;
        
        -- Calculate final score
        v_score := v_species_score + v_age_score + v_size_score + 
                  v_energy_score + v_location_score + v_pets_score + 
                  v_special_needs_score;
        
        -- Ensure score is within bounds
        v_score := GREATEST(0, LEAST(v_max_score, v_score));
        
        -- Log this calculation
        log_matching_interaction(p_user_id, p_animal_id, 'score_calculated', v_score);
        
        RETURN ROUND(v_score, 2);
    EXCEPTION
        WHEN OTHERS THEN
            -- Return default score on error
            RETURN 50;
    END calculate_compatibility_score;
    
    -- Get recommended pets for a user
    FUNCTION get_pet_recommendations(
        p_user_id NUMBER,
        p_limit NUMBER DEFAULT 10
    ) RETURN SYS_REFCURSOR IS
        v_result SYS_REFCURSOR;
    BEGIN
        OPEN v_result FOR
            WITH scored_animals AS (
                SELECT 
                    a.id,
                    a.name,
                    a.species,
                    a.breed,
                    a.age_years,
                    a.size_category,
                    a.gender,
                    a.energy_level,
                    a.good_with_kids,
                    a.good_with_pets,
                    a.adoption_status,
                    pet_matching_pkg.calculate_compatibility_score(p_user_id, a.id) AS compatibility_score
                FROM 
                    animals a
                WHERE 
                    a.adoption_status = 'available'
            )
            SELECT 
                id,
                name,
                species,
                breed,
                age_years,
                size_category,
                gender,
                energy_level,
                good_with_kids,
                good_with_pets,
                compatibility_score
            FROM 
                scored_animals
            ORDER BY 
                compatibility_score DESC, id
            FETCH FIRST p_limit ROWS ONLY;
            
        RETURN v_result;
    END get_pet_recommendations;
    
    -- Log matching interaction
    PROCEDURE log_matching_interaction(
        p_user_id NUMBER,
        p_animal_id NUMBER,
        p_action VARCHAR2,
        p_score NUMBER DEFAULT NULL
    ) IS
    BEGIN
        INSERT INTO matching_history (
            user_id,
            animal_id,
            compatibility_score,
            user_action,
            calculated_at
        ) VALUES (
            p_user_id,
            p_animal_id,
            NVL(p_score, 0),
            p_action,
            CURRENT_TIMESTAMP
        );
    EXCEPTION
        WHEN OTHERS THEN
            NULL; -- Ignore errors in logging
    END log_matching_interaction;
    
    -- Calculate distance between coordinates using Haversine formula
    FUNCTION calculate_distance(
        p_lat1 NUMBER, p_lon1 NUMBER,
        p_lat2 NUMBER, p_lon2 NUMBER
    ) RETURN NUMBER IS
        v_radius NUMBER := 6371; -- Earth's radius in kilometers
        v_dlat NUMBER;
        v_dlon NUMBER;
        v_a NUMBER;
        v_c NUMBER;
        v_distance NUMBER;
    BEGIN
        -- Convert degrees to radians
        v_dlat := (p_lat2 - p_lat1) * 3.14159265358979323846 / 180;
        v_dlon := (p_lon2 - p_lon1) * 3.14159265358979323846 / 180;
        
        -- Haversine formula
        v_a := SIN(v_dlat/2) * SIN(v_dlat/2) +
               COS(p_lat1 * 3.14159265358979323846 / 180) * COS(p_lat2 * 3.14159265358979323846 / 180) *
               SIN(v_dlon/2) * SIN(v_dlon/2);
        v_c := 2 * ATAN2(SQRT(v_a), SQRT(1-v_a));
        v_distance := v_radius * v_c;
        
        RETURN v_distance;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN 999999; -- Return large distance on error
    END calculate_distance;
    
END pet_matching_pkg;
/ 