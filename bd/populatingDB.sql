DELETE FROM adoption_status_log;
DELETE FROM user_preference_tags;
DELETE FROM animal_tags;
DELETE FROM tags;
DELETE FROM media;
DELETE FROM medical_history;
DELETE FROM care_resources;
DELETE FROM care_schedule;
DELETE FROM favorites;
DELETE FROM adoptions;
DELETE FROM animals;
DELETE FROM users;
DELETE FROM address;


-- Insert into address
INSERT INTO address VALUES (1, '123 Main St', 'Springfield', 'USA', 40.7128, -74.0060);
INSERT INTO address VALUES (2, '456 Elm St', 'Shelbyville', 'USA', 41.0000, -75.0000);
INSERT INTO address VALUES (3, '789 Oak St', 'Capital City', 'USA', 39.9526, -75.1652);
INSERT INTO address VALUES (4, '101 Pine St', 'Riverdale', 'USA', 42.3601, -71.0589);

-- Insert into users
INSERT INTO users VALUES (1, 'john_doe', 'pass123', 'john@example.com', 1, 'user', CURRENT_TIMESTAMP);
INSERT INTO users VALUES (2, 'jane_admin', 'adminpass', 'jane@example.com', 2, 'admin', CURRENT_TIMESTAMP);
INSERT INTO users VALUES (3, 'alice_smith', 'alicepass', 'alice@example.com', 3, 'user', CURRENT_TIMESTAMP);
INSERT INTO users VALUES (4, 'bob_williams', 'bobpass', 'bob@example.com', 4, 'admin', CURRENT_TIMESTAMP);

-- Insert into animals
INSERT INTO animals VALUES (1, 'Buddy', 'Dog', 'Healthy', 'Friendly golden retriever.', 1, 'Good with other pets', CURRENT_TIMESTAMP);
INSERT INTO animals VALUES (2, 'Whiskers', 'Cat', 'Needs medication', 'Calm senior cat.', 2, 'Prefers to be alone', CURRENT_TIMESTAMP);
INSERT INTO animals VALUES (3, 'Bella', 'Dog', 'Healthy', 'Energetic bulldog.', 3, 'Loves to play fetch', CURRENT_TIMESTAMP);
INSERT INTO animals VALUES (4, 'Mittens', 'Cat', 'Needs Medication', 'Shy black cat.', 4, 'Likes quiet places', CURRENT_TIMESTAMP);

-- Insert into adoptions
INSERT INTO adoptions VALUES (1, 1, 1, CURRENT_TIMESTAMP, NULL, 'open');
INSERT INTO adoptions VALUES (2, 2, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'completed');
INSERT INTO adoptions VALUES (3, 3, 3, CURRENT_TIMESTAMP, NULL, 'open');
INSERT INTO adoptions VALUES (4, 4, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'completed');

-- Insert into favorites
INSERT INTO favorites VALUES (1, 2, CURRENT_TIMESTAMP);
INSERT INTO favorites VALUES (2, 1, CURRENT_TIMESTAMP);
INSERT INTO favorites VALUES (3, 4, CURRENT_TIMESTAMP);
INSERT INTO favorites VALUES (4, 3, CURRENT_TIMESTAMP);

-- Insert into care_schedule
INSERT INTO care_schedule VALUES (1, 1, 'Feeding', '08:00', 'Daily');
INSERT INTO care_schedule VALUES (2, 2, 'Vet Visit', '14:00', 'Weekly');
INSERT INTO care_schedule VALUES (3, 3, 'Feeding', '09:00', 'Daily');
INSERT INTO care_schedule VALUES (4, 4, 'Vet Visit', '10:00', 'Monthly');

-- Insert into care_resources
INSERT INTO care_resources VALUES (1, 1, 'Guide', 'Feeding Tips', 'Feed twice daily with dog food.');
INSERT INTO care_resources VALUES (2, 2, 'Video', 'How to Give Pills', 'Instructional video on giving medication.');
INSERT INTO care_resources VALUES (3, 3, 'Guide', 'Exercise Tips', 'Walk bulldog three times a week.');
INSERT INTO care_resources VALUES (4, 4, 'Video', 'Cat Grooming', 'Instructions on grooming a cat.');


-- Insert into medical_history
INSERT INTO medical_history VALUES (1, 2, 'Kidney issues, requires special diet.', CURRENT_TIMESTAMP);
INSERT INTO medical_history VALUES (2, 3, 'Has arthritis, needs joint supplements.', CURRENT_TIMESTAMP);
INSERT INTO medical_history VALUES (3, 4, 'Has a sensitive stomach, needs special food.', CURRENT_TIMESTAMP);


-- Insert into media
INSERT INTO media VALUES (1, 1, 'image', '/images/buddy.jpg');
INSERT INTO media VALUES (2, 2, 'video', '/videos/whiskers.mp4');
INSERT INTO media VALUES (3, 3, 'image', '/images/bella.jpg');
INSERT INTO media VALUES (4, 4, 'video', '/videos/mittens.mp4');

-- Insert into tags
INSERT INTO tags VALUES (1, 'Friendly');
INSERT INTO tags VALUES (2, 'Senior');
INSERT INTO tags VALUES (3, 'Needs Medication');
INSERT INTO tags VALUES (4, 'Energetic');
INSERT INTO tags VALUES (5, 'Shy');
INSERT INTO tags VALUES (6, 'Needs Medication');
INSERT INTO tags VALUES (7, 'Loves Fetch');

-- Insert into animal_tags
INSERT INTO animal_tags VALUES (1, 1);
INSERT INTO animal_tags VALUES (2, 2);
INSERT INTO animal_tags VALUES (2, 3);
INSERT INTO animal_tags VALUES (3, 4);
INSERT INTO animal_tags VALUES (4, 5);
INSERT INTO animal_tags VALUES (4, 6);

-- Insert into user_preference_tags
INSERT INTO user_preference_tags VALUES (1, 1);
INSERT INTO user_preference_tags VALUES (2, 2);
INSERT INTO user_preference_tags VALUES (3, 4);
INSERT INTO user_preference_tags VALUES (4, 5);

-- Insert into adoption_status_log
INSERT INTO adoption_status_log VALUES (1, 2, 'pending', CURRENT_TIMESTAMP);
INSERT INTO adoption_status_log VALUES (2, 2, 'completed', CURRENT_TIMESTAMP);
INSERT INTO adoption_status_log VALUES (3, 3, 'pending', CURRENT_TIMESTAMP);
INSERT INTO adoption_status_log VALUES (4, 4, 'completed', CURRENT_TIMESTAMP);

COMMIT;
