select  * from favorites;

select * from users;

select * from tags;

select * from USER_PREFERENCE_TAGS;

select s.ID, s.username, t.TAG_ID from users s join USER_PREFERENCE_TAGS t on s.id = t.user_id;

SELECT COUNT(*) FROM users WHERE UPPER(TRIM(username)) = UPPER(TRIM('geo19'));
SELECT COUNT(*) FROM users WHERE UPPER(TRIM(email)) = UPPER(TRIM('geo19@yahoo.com'));

INSERT INTO users (username, password_hash, email) VALUES ('geo19', 'hash_parola', 'geo19@example.com');
COMMIT;



SELECT constraint_name, constraint_type, search_condition
FROM user_constraints
WHERE table_name = 'USERS';

SELECT id, DUMP(id), name FROM tags WHERE id IN (5, 12);
SELECT * FROM tags ORDER BY id;

