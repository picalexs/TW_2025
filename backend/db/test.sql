select  * from favorites;

select * from users;
SELECT COUNT(*) FROM users WHERE UPPER(TRIM(username)) = UPPER(TRIM('geo19'));
SELECT COUNT(*) FROM users WHERE UPPER(TRIM(email)) = UPPER(TRIM('geo19@yahoo.com'));

INSERT INTO users (username, password_hash, email) VALUES ('geo19', 'hash_parola', 'geo19@example.com');
COMMIT;



SELECT constraint_name, constraint_type, search_condition
FROM user_constraints
WHERE table_name = 'USERS';

