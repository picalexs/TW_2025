delete from adoption_status_log;
delete from user_preference_tags;
delete from animal_tags;
delete from favorites;
delete from adoptions;
delete from media;
delete from medical_history;
delete from care_resources;
delete from care_schedule;
delete from animals;
delete from users;
delete from tags;
delete from address;

commit;

-- Insert into address
insert into address (
   id,
   street,
   city,
   country,
   latitude,
   longitude
) values ( 1,
           '123 Main St',
           'Springfield',
           'USA',
           40.7128,
           - 74.0060 );
insert into address (
   id,
   street,
   city,
   country,
   latitude,
   longitude
) values ( 2,
           '456 Elm St',
           'Shelbyville',
           'USA',
           41.0000,
           - 75.0000 );
insert into address (
   id,
   street,
   city,
   country,
   latitude,
   longitude
) values ( 3,
           '789 Oak St',
           'Capital City',
           'USA',
           39.9526,
           - 75.1652 );
insert into address (
   id,
   street,
   city,
   country,
   latitude,
   longitude
) values ( 4,
           '101 Pine St',
           'Riverdale',
           'USA',
           42.3601,
           - 71.0589 );

commit;

-- Insert into users
insert into users (
   id,
   username,
   password_hash,
   email,
   is_verified,
   email_token,
   token_expires,
   address_id,
   role,
   created_at
) values ( 1,
           'john_doe',
           'hashed_pass_john',
           'john@example.com',
           1,
           null,
           null,
           1,
           'user',
           current_timestamp );
insert into users (
   id,
   username,
   password_hash,
   email,
   is_verified,
   email_token,
   token_expires,
   address_id,
   role,
   created_at
) values ( 2,
           'jane_admin',
           'hashed_pass_jane',
           'jane@example.com',
           1,
           null,
           null,
           2,
           'admin',
           current_timestamp );
insert into users (
   id,
   username,
   password_hash,
   email,
   is_verified,
   email_token,
   token_expires,
   address_id,
   role,
   created_at
) values ( 3,
           'alice_smith',
           'hashed_pass_alice',
           'alice@example.com',
           0,
           'token_alice_123',
           current_timestamp + interval '1' day,
           3,
           'user',
           current_timestamp );
insert into users (
   id,
   username,
   password_hash,
   email,
   is_verified,
   email_token,
   token_expires,
   address_id,
   role,
   created_at
) values ( 4,
           'bob_williams',
           'hashed_pass_bob',
           'bob@example.com',
           0,
           'token_bob_456',
           current_timestamp + interval '1' day,
           4,
           'admin',
           current_timestamp );

commit;

-- Insert into animals
insert into animals (
   id,
   name,
   species,
   health_status,
   description,
   address_id,
   relation_with_others,
   created_at
) values ( 1,
           'Buddy',
           'Dog',
           'Healthy',
           'Friendly golden retriever.',
           1,
           'Good with other pets',
           current_timestamp );
insert into animals (
   id,
   name,
   species,
   health_status,
   description,
   address_id,
   relation_with_others,
   created_at
) values ( 2,
           'Whiskers',
           'Cat',
           'Needs medication',
           'Calm senior cat.',
           2,
           'Prefers to be alone',
           current_timestamp );
insert into animals (
   id,
   name,
   species,
   health_status,
   description,
   address_id,
   relation_with_others,
   created_at
) values ( 3,
           'Bella',
           'Dog',
           'Healthy',
           'Energetic bulldog.',
           3,
           'Loves to play fetch',
           current_timestamp );
insert into animals (
   id,
   name,
   species,
   health_status,
   description,
   address_id,
   relation_with_others,
   created_at
) values ( 4,
           'Mittens',
           'Cat',
           'Needs Medication',
           'Shy black cat.',
           4,
           'Likes quiet places',
           current_timestamp );

commit;

-- Insert into tags
insert into tags (
   id,
   name
) values ( 1,
           'Friendly' );
insert into tags (
   id,
   name
) values ( 2,
           'Senior' );
insert into tags (
   id,
   name
) values ( 3,
           'Needs Medication' );
insert into tags (
   id,
   name
) values ( 4,
           'Energetic' );
insert into tags (
   id,
   name
) values ( 5,
           'Shy' );
insert into tags (
   id,
   name
) values ( 6,
           'Loves Fetch' );

commit;

-- Insert into adoptions
insert into adoptions (
   id,
   user_id,
   animal_id,
   request_date,
   adoption_date,
   status
) values ( 1,
           1,
           1,
           current_timestamp,
           null,
           'open' );
insert into adoptions (
   id,
   user_id,
   animal_id,
   request_date,
   adoption_date,
   status
) values ( 2,
           2,
           2,
           current_timestamp,
           current_timestamp,
           'completed' );
insert into adoptions (
   id,
   user_id,
   animal_id,
   request_date,
   adoption_date,
   status
) values ( 3,
           3,
           3,
           current_timestamp,
           null,
           'open' );
insert into adoptions (
   id,
   user_id,
   animal_id,
   request_date,
   adoption_date,
   status
) values ( 4,
           4,
           4,
           current_timestamp,
           current_timestamp,
           'completed' );

commit;

-- Insert into favorites
insert into favorites (
   user_id,
   animal_id,
   favorited_at
) values ( 1,
           2,
           current_timestamp );
insert into favorites (
   user_id,
   animal_id,
   favorited_at
) values ( 2,
           1,
           current_timestamp );
insert into favorites (
   user_id,
   animal_id,
   favorited_at
) values ( 3,
           4,
           current_timestamp );
insert into favorites (
   user_id,
   animal_id,
   favorited_at
) values ( 4,
           3,
           current_timestamp );

commit;

-- Insert into care_schedule
insert into care_schedule (
   id,
   animal_id,
   activity,
   hour,
   frequency
) values ( 1,
           1,
           'Feeding',
           '08:00',
           'Daily' );
insert into care_schedule (
   id,
   animal_id,
   activity,
   hour,
   frequency
) values ( 2,
           2,
           'Vet Visit',
           '14:00',
           'Weekly' );
insert into care_schedule (
   id,
   animal_id,
   activity,
   hour,
   frequency
) values ( 3,
           3,
           'Feeding',
           '09:00',
           'Daily' );
insert into care_schedule (
   id,
   animal_id,
   activity,
   hour,
   frequency
) values ( 4,
           4,
           'Vet Visit',
           '10:00',
           'Monthly' );

commit;

-- Insert into care_resources
insert into care_resources (
   id,
   animal_id,
   resource_type,
   title,
   content
) values ( 1,
           1,
           'Guide',
           'Feeding Tips',
           'Feed twice daily with dog food.' );
insert into care_resources (
   id,
   animal_id,
   resource_type,
   title,
   content
) values ( 2,
           2,
           'Video',
           'How to Give Pills',
           'Instructional video on giving medication.' );
insert into care_resources (
   id,
   animal_id,
   resource_type,
   title,
   content
) values ( 3,
           3,
           'Guide',
           'Exercise Tips',
           'Walk bulldog three times a week.' );
insert into care_resources (
   id,
   animal_id,
   resource_type,
   title,
   content
) values ( 4,
           4,
           'Video',
           'Cat Grooming',
           'Instructions on grooming a cat.' );

commit;

-- Insert into medical_history
insert into medical_history (
   id,
   animal_id,
   description,
   record_date
) values ( 1,
           2,
           'Kidney issues, requires special diet.',
           current_timestamp );
insert into medical_history (
   id,
   animal_id,
   description,
   record_date
) values ( 2,
           3,
           'Has arthritis, needs joint supplements.',
           current_timestamp );
insert into medical_history (
   id,
   animal_id,
   description,
   record_date
) values ( 3,
           4,
           'Has a sensitive stomach, needs special food.',
           current_timestamp );

commit;

-- Insert into media
insert into media (
   id,
   animal_id,
   type,
   file_path
) values ( 1,
           1,
           'image',
           '/images/profile/1.jpg' );
insert into media (
   id,
   animal_id,
   type,
   file_path
) values ( 2,
           2,
           'video',
           '/images/profile/2.jpg' );
insert into media (
   id,
   animal_id,
   type,
   file_path
) values ( 3,
           3,
           'image',
           '/images/profile/3.jpg' );
insert into media (
   id,
   animal_id,
   type,
   file_path
) values ( 4,
           4,
           'video',
           '/images/profile/4.jpg' );

commit;

-- Insert into animal_tags
insert into animal_tags (
   animal_id,
   tag_id
) values ( 1,
           1 );
insert into animal_tags (
   animal_id,
   tag_id
) values ( 2,
           2 );
insert into animal_tags (
   animal_id,
   tag_id
) values ( 2,
           3 );
insert into animal_tags (
   animal_id,
   tag_id
) values ( 3,
           4 );
insert into animal_tags (
   animal_id,
   tag_id
) values ( 4,
           5 );
insert into animal_tags (
   animal_id,
   tag_id
) values ( 4,
           3 );

commit;

-- Insert into user_preference_tags
insert into user_preference_tags (
   user_id,
   tag_id
) values ( 1,
           1 );
insert into user_preference_tags (
   user_id,
   tag_id
) values ( 2,
           2 );
insert into user_preference_tags (
   user_id,
   tag_id
) values ( 3,
           4 );
insert into user_preference_tags (
   user_id,
   tag_id
) values ( 4,
           5 );

commit;

-- Insert into adoption_status_log
insert into adoption_status_log (
   id,
   adoption_id,
   status,
   changed_at
) values ( 1,
           2,
           'pending',
           current_timestamp );
insert into adoption_status_log (
   id,
   adoption_id,
   status,
   changed_at
) values ( 2,
           2,
           'completed',
           current_timestamp );
insert into adoption_status_log (
   id,
   adoption_id,
   status,
   changed_at
) values ( 3,
           3,
           'pending',
           current_timestamp );
insert into adoption_status_log (
   id,
   adoption_id,
   status,
   changed_at
) values ( 4,
           4,
           'completed',
           current_timestamp );

commit;

-- Verify all data was inserted correctly
select 'users' as table_name,
       count(*) as record_count
  from users
union all
select 'adoptions',
       count(*)
  from adoptions
union all
select 'user_preference_tags',
       count(*)
  from user_preference_tags
union all
select 'adoption_status_log',
       count(*)
  from adoption_status_log;

select *
  from users;