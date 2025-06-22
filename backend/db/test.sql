select  * from favorites;

select * from users;

select * from tags;

select * from USER_PREFERENCE_TAGS;

select s.ID, s.username, u.name from users s join USER_PREFERENCE_TAGS t on s.id = t.user_id join tags u on u.ID = t.tag_id order by s.ID;


SELECT constraint_name, constraint_type, search_condition
FROM user_constraints
WHERE table_name = 'USERS';

SELECT id, DUMP(id), name FROM tags WHERE id IN (5, 12);
SELECT * FROM tags ORDER BY id;



UPDATE users
SET role = 'admin'
WHERE username = 'admin';
COMMIT;

SELECT * FROM users WHERE username = 'admin';

UPDATE users
SET role = 'admin'
WHERE username = 'geo';


SELECT * FROM users WHERE username = 'geo';

SELECT ID, USERNAME, PASSWORD_HASH, EMAIL, IS_VERIFIED, ROLE FROM users WHERE email = 'admin@admin.com';