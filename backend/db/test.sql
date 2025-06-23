select  * from favorites;

select * from users;

select s.ID, s.username, u.name from users s join USER_PREFERENCE_TAGS t on s.id = t.user_id join tags u on u.ID = t.tag_id order by s.ID;



UPDATE users
SET role = 'admin'
WHERE username = 'admin';
COMMIT;

SELECT * FROM users WHERE username = 'admin';


select * from owner_reviews;

