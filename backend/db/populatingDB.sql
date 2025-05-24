DELETE FROM adoption_status_log;
DELETE FROM user_preference_tags;
DELETE FROM animal_tags;
DELETE FROM favorites;
DELETE FROM adoptions;
DELETE FROM media;
DELETE FROM medical_history;
DELETE FROM care_resources;
DELETE FROM care_schedule;
DELETE FROM animals;
DELETE FROM users;
DELETE FROM tags;
DELETE FROM address;

COMMIT;

-- Insert into address
INSERT INTO address (id, street, city, country, latitude, longitude) VALUES (1, '123 Main St', 'Springfield', 'USA', 40.7128, -74.0060);
INSERT INTO address (id, street, city, country, latitude, longitude) VALUES (2, '456 Elm St', 'Shelbyville', 'USA', 41.0000, -75.0000);
INSERT INTO address (id, street, city, country, latitude, longitude) VALUES (3, '789 Oak St', 'Capital City', 'USA', 39.9526, -75.1652);
INSERT INTO address (id, street, city, country, latitude, longitude) VALUES (4, '101 Pine St', 'Riverdale', 'USA', 42.3601, -71.0589);

-- Insert into users
INSERT INTO users (id, username, password_hash, email, is_verified, email_token, token_expires, address_id, role, created_at)
VALUES (1, 'john_doe', 'hashed_pass_john', 'john@example.com', 1, NULL, NULL, 1, 'user', CURRENT_TIMESTAMP);
INSERT INTO users (id, username, password_hash, email, is_verified, email_token, token_expires, address_id, role, created_at)
VALUES (2, 'jane_admin', 'hashed_pass_jane', 'jane@example.com', 1, NULL, NULL, 2, 'admin', CURRENT_TIMESTAMP);
INSERT INTO users (id, username, password_hash, email, is_verified, email_token, token_expires, address_id, role, created_at)
VALUES (3, 'alice_smith', 'hashed_pass_alice', 'alice@example.com', 0, 'token_alice_123', CURRENT_TIMESTAMP + INTERVAL '1' DAY, 3, 'user', CURRENT_TIMESTAMP);
INSERT INTO users (id, username, password_hash, email, is_verified, email_token, token_expires, address_id, role, created_at)
VALUES (4, 'bob_williams', 'hashed_pass_bob', 'bob@example.com', 0, 'token_bob_456', CURRENT_TIMESTAMP + INTERVAL '1' DAY, 4, 'admin', CURRENT_TIMESTAMP);

-- Insert into animals
INSERT INTO animals (id, name, species, health_status, description, address_id, relation_with_others, created_at)
VALUES (1, 'Buddy', 'Dog', 'Healthy', 'Friendly golden retriever.', 1, 'Good with other pets', CURRENT_TIMESTAMP);
INSERT INTO animals (id, name, species, health_status, description, address_id, relation_with_others, created_at)
VALUES (2, 'Whiskers', 'Cat', 'Needs medication', 'Calm senior cat.', 2, 'Prefers to be alone', CURRENT_TIMESTAMP);
INSERT INTO animals (id, name, species, health_status, description, address_id, relation_with_others, created_at)
VALUES (3, 'Bella', 'Dog', 'Healthy', 'Energetic bulldog.', 3, 'Loves to play fetch', CURRENT_TIMESTAMP);
INSERT INTO animals (id, name, species, health_status, description, address_id, relation_with_others, created_at)
VALUES (4, 'Mittens', 'Cat', 'Needs Medication', 'Shy black cat.', 4, 'Likes quiet places', CURRENT_TIMESTAMP);

-- Insert into tags
INSERT INTO tags (id, name) VALUES (1, 'Friendly');
INSERT INTO tags (id, name) VALUES (2, 'Senior');
INSERT INTO tags (id, name) VALUES (3, 'Needs Medication'); 
INSERT INTO tags (id, name) VALUES (4, 'Energetic');
INSERT INTO tags (id, name) VALUES (5, 'Shy');
INSERT INTO tags (id, name) VALUES (6, 'Loves Fetch'); 

-- Insert into adoptions
INSERT INTO adoptions (id, user_id, animal_id, request_date, adoption_date, status) VALUES (1, 1, 1, CURRENT_TIMESTAMP, NULL, 'open');
INSERT INTO adoptions (id, user_id, animal_id, request_date, adoption_date, status) VALUES (2, 2, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'completed');
INSERT INTO adoptions (id, user_id, animal_id, request_date, adoption_date, status) VALUES (3, 3, 3, CURRENT_TIMESTAMP, NULL, 'open');
INSERT INTO adoptions (id, user_id, animal_id, request_date, adoption_date, status) VALUES (4, 4, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'completed');

-- Insert into favorites
INSERT INTO favorites (user_id, animal_id, favorited_at) VALUES (1, 2, CURRENT_TIMESTAMP);
INSERT INTO favorites (user_id, animal_id, favorited_at) VALUES (2, 1, CURRENT_TIMESTAMP);
INSERT INTO favorites (user_id, animal_id, favorited_at) VALUES (3, 4, CURRENT_TIMESTAMP);
INSERT INTO favorites (user_id, animal_id, favorited_at) VALUES (4, 3, CURRENT_TIMESTAMP);

-- Insert into care_schedule
INSERT INTO care_schedule (id, animal_id, activity, hour, frequency) VALUES (1, 1, 'Feeding', '08:00', 'Daily');
INSERT INTO care_schedule (id, animal_id, activity, hour, frequency) VALUES (2, 2, 'Vet Visit', '14:00', 'Weekly');
INSERT INTO care_schedule (id, animal_id, activity, hour, frequency) VALUES (3, 3, 'Feeding', '09:00', 'Daily');
INSERT INTO care_schedule (id, animal_id, activity, hour, frequency) VALUES (4, 4, 'Vet Visit', '10:00', 'Monthly');

-- Insert into care_resources
INSERT INTO care_resources (id, animal_id, resource_type, title, content) VALUES (1, 1, 'Guide', 'Feeding Tips', 'Feed twice daily with dog food.');
INSERT INTO care_resources (id, animal_id, resource_type, title, content) VALUES (2, 2, 'Video', 'How to Give Pills', 'Instructional video on giving medication.');
INSERT INTO care_resources (id, animal_id, resource_type, title, content) VALUES (3, 3, 'Guide', 'Exercise Tips', 'Walk bulldog three times a week.');
INSERT INTO care_resources (id, animal_id, resource_type, title, content) VALUES (4, 4, 'Video', 'Cat Grooming', 'Instructions on grooming a cat.');

-- Insert into medical_history
INSERT INTO medical_history (id, animal_id, description, record_date) VALUES (1, 2, 'Kidney issues, requires special diet.', CURRENT_TIMESTAMP);
INSERT INTO medical_history (id, animal_id, description, record_date) VALUES (2, 3, 'Has arthritis, needs joint supplements.', CURRENT_TIMESTAMP);
INSERT INTO medical_history (id, animal_id, description, record_date) VALUES (3, 4, 'Has a sensitive stomach, needs special food.', CURRENT_TIMESTAMP);

-- Insert into media
INSERT INTO media (id, animal_id, type, file_path) VALUES (1, 1, 'image', '/images/buddy.jpg');
INSERT INTO media (id, animal_id, type, file_path) VALUES (2, 2, 'video', '/videos/whiskers.mp4');
INSERT INTO media (id, animal_id, type, file_path) VALUES (3, 3, 'image', '/images/bella.jpg');
INSERT INTO media (id, animal_id, type, file_path) VALUES (4, 4, 'video', '/videos/mittens.mp4');

-- Insert into animal_tags
INSERT INTO animal_tags (animal_id, tag_id) VALUES (1, 1); 
INSERT INTO animal_tags (animal_id, tag_id) VALUES (2, 2); 
INSERT INTO animal_tags (animal_id, tag_id) VALUES (2, 3); 
INSERT INTO animal_tags (animal_id, tag_id) VALUES (3, 4); 
INSERT INTO animal_tags (animal_id, tag_id) VALUES (4, 5); 
INSERT INTO animal_tags (animal_id, tag_id) VALUES (4, 3);

-- Insert into user_preference_tags
INSERT INTO user_preference_tags (user_id, tag_id) VALUES (1, 1);
INSERT INTO user_preference_tags (user_id, tag_id) VALUES (2, 2);
INSERT INTO user_preference_tags (user_id, tag_id) VALUES (3, 4);
INSERT INTO user_preference_tags (user_id, tag_id) VALUES (4, 5);

-- Insert into adoption_status_log
INSERT INTO adoption_status_log (id, adoption_id, status, changed_at) VALUES (1, 2, 'pending', CURRENT_TIMESTAMP);
INSERT INTO adoption_status_log (id, adoption_id, status, changed_at) VALUES (2, 2, 'completed', CURRENT_TIMESTAMP);
INSERT INTO adoption_status_log (id, adoption_id, status, changed_at) VALUES (3, 3, 'pending', CURRENT_TIMESTAMP);
INSERT INTO adoption_status_log (id, adoption_id, status, changed_at) VALUES (4, 4, 'completed', CURRENT_TIMESTAMP);

COMMIT;