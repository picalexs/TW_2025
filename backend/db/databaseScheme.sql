BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE user_preference_tags CASCADE CONSTRAINTS';
  EXECUTE IMMEDIATE 'DROP TABLE adoption_status_log CASCADE CONSTRAINTS';
  EXECUTE IMMEDIATE 'DROP TABLE animal_tags CASCADE CONSTRAINTS';
  EXECUTE IMMEDIATE 'DROP TABLE tags CASCADE CONSTRAINTS';
  EXECUTE IMMEDIATE 'DROP TABLE media CASCADE CONSTRAINTS';
  EXECUTE IMMEDIATE 'DROP TABLE medical_history CASCADE CONSTRAINTS';
  EXECUTE IMMEDIATE 'DROP TABLE care_resources CASCADE CONSTRAINTS';
  EXECUTE IMMEDIATE 'DROP TABLE care_schedule CASCADE CONSTRAINTS';
  EXECUTE IMMEDIATE 'DROP TABLE favorites CASCADE CONSTRAINTS';
  EXECUTE IMMEDIATE 'DROP TABLE adoptions CASCADE CONSTRAINTS';
  EXECUTE IMMEDIATE 'DROP TABLE animals CASCADE CONSTRAINTS';
  EXECUTE IMMEDIATE 'DROP TABLE users CASCADE CONSTRAINTS';
  EXECUTE IMMEDIATE 'DROP TABLE address CASCADE CONSTRAINTS';
END;
/

CREATE TABLE address (
  id NUMBER PRIMARY KEY,
  street VARCHAR2(255),
  city VARCHAR2(100),
  country VARCHAR2(100),
  latitude FLOAT,
  longitude FLOAT
);


CREATE TABLE users (
  id NUMBER PRIMARY KEY,
  username VARCHAR2(50) UNIQUE NOT NULL,
  password_hash VARCHAR2(100) NOT NULL,
  email VARCHAR2(100) UNIQUE NOT NULL,
  is_verified NUMBER(1) DEFAULT 0,
  email_token VARCHAR2(255),
  token_expires TIMESTAMP,
  address_id NUMBER,
  role VARCHAR2(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_address FOREIGN KEY (address_id) REFERENCES address(id)
);

CREATE TABLE animals (
  id NUMBER PRIMARY KEY,
  name VARCHAR2(100) NOT NULL,
  species VARCHAR2(50),
  health_status VARCHAR2(255),
  description CLOB,
  address_id NUMBER,
  relation_with_others VARCHAR2(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_animals_address FOREIGN KEY (address_id) REFERENCES address(id)
);

CREATE TABLE adoptions (
  id NUMBER PRIMARY KEY,
  user_id NUMBER NOT NULL,
  animal_id NUMBER NOT NULL,
  request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  adoption_date TIMESTAMP,
  status VARCHAR2(50) DEFAULT 'open',
  CONSTRAINT fk_adoptions_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_adoptions_animal FOREIGN KEY (animal_id) REFERENCES animals(id)
);

CREATE TABLE favorites (
  user_id NUMBER NOT NULL,
  animal_id NUMBER NOT NULL,
  favorited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_favorites PRIMARY KEY (user_id, animal_id),
  CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_favorites_animal FOREIGN KEY (animal_id) REFERENCES animals(id)
);

CREATE TABLE care_schedule (
  id NUMBER PRIMARY KEY,
  animal_id NUMBER NOT NULL,
  activity VARCHAR2(100),
  hour VARCHAR2(10),
  frequency VARCHAR2(50),
  CONSTRAINT fk_care_schedule_animal FOREIGN KEY (animal_id) REFERENCES animals(id)
);

CREATE TABLE care_resources (
  id NUMBER PRIMARY KEY,
  animal_id NUMBER NOT NULL,
  resource_type VARCHAR2(50),
  title VARCHAR2(255),
  content CLOB,
  CONSTRAINT fk_care_resources_animal FOREIGN KEY (animal_id) REFERENCES animals(id)
);

CREATE TABLE medical_history (
  id NUMBER PRIMARY KEY,
  animal_id NUMBER NOT NULL,
  description CLOB,
  record_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_medical_history_animal FOREIGN KEY (animal_id) REFERENCES animals(id)
);

CREATE TABLE media (
  id NUMBER PRIMARY KEY,
  animal_id NUMBER NOT NULL,
  type VARCHAR2(20),
  file_path VARCHAR2(255),
  CONSTRAINT fk_media_animal FOREIGN KEY (animal_id) REFERENCES animals(id)
);

CREATE TABLE tags (
  id NUMBER PRIMARY KEY,
  name VARCHAR2(100) UNIQUE NOT NULL
);

CREATE TABLE animal_tags (
  animal_id NUMBER NOT NULL,
  tag_id NUMBER NOT NULL,
  CONSTRAINT pk_animal_tags PRIMARY KEY (animal_id, tag_id),
  CONSTRAINT fk_animal_tags_animal FOREIGN KEY (animal_id) REFERENCES animals(id),
  CONSTRAINT fk_animal_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id)
);

CREATE TABLE user_preference_tags (
  user_id NUMBER NOT NULL,
  tag_id NUMBER NOT NULL,
  CONSTRAINT pk_user_preference_tags PRIMARY KEY (user_id, tag_id),
  CONSTRAINT fk_user_tags_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_user_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id)
);

CREATE TABLE adoption_status_log (
  id NUMBER PRIMARY KEY,
  adoption_id NUMBER NOT NULL,
  status VARCHAR2(50),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_status_log_adoption FOREIGN KEY (adoption_id) REFERENCES adoptions(id)
);
