select  * from favorites;

select * from users;

select s.ID, s.username, u.name from users s join USER_PREFERENCE_TAGS t on s.id = t.user_id join tags u on u.ID = t.tag_id order by s.ID;



UPDATE users
SET role = 'admin'
WHERE username = 'admin';
COMMIT;

SELECT * FROM users WHERE username = 'admin';


select * from owner_reviews;

DELETE FROM animal_tags WHERE animal_id = 61;
DELETE FROM favorites WHERE animal_id = 61;
DELETE FROM care_schedule WHERE animal_id = 61;
DELETE FROM care_resources WHERE animal_id = 61;
DELETE FROM medical_history WHERE animal_id = 61;
DELETE FROM media WHERE animal_id = 61;
DELETE FROM animal_metrics WHERE animal_id = 61;
DELETE FROM adoptions WHERE animal_id = 61;
DELETE FROM conversations WHERE animal_id = 61;
DELETE FROM system_logs WHERE animal_id = 61;
DELETE FROM animals WHERE id = 61;
COMMIT;

