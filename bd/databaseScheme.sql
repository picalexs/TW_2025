CREATE TABLE "users" (
  "id" integer PRIMARY KEY,
  "username" varchar(50) UNIQUE NOT NULL,
  "password" varchar(100) NOT NULL,
  "email" varchar(100) UNIQUE NOT NULL,
  "address_id" integer,
  "role" varchar(20) DEFAULT 'user',
  "created_at" timestamp DEFAULT 'CURRENT_TIMESTAMP'
);

CREATE TABLE "address" (
  "id" integer PRIMARY KEY,
  "street" varchar(255),
  "city" varchar(100),
  "country" varchar(100),
  "latitude" float,
  "longitude" float
);

CREATE TABLE "animals" (
  "id" integer PRIMARY KEY,
  "name" varchar(100) NOT NULL,
  "species" varchar(50),
  "health_status" varchar(255),
  "description" text,
  "address_id" integer,
  "relation_with_others" varchar(100),
  "created_at" timestamp DEFAULT 'CURRENT_TIMESTAMP'
);

CREATE TABLE "adoptions" (
  "id" integer PRIMARY KEY,
  "user_id" integer NOT NULL,
  "animal_id" integer NOT NULL,
  "request_date" timestamp DEFAULT 'CURRENT_TIMESTAMP',
  "adoption_date" timestamp,
  "status" varchar(50) DEFAULT 'pending'
);

CREATE TABLE "favorites" (
  "user_id" integer NOT NULL,
  "animal_id" integer NOT NULL,
  "favorited_at" timestamp DEFAULT 'CURRENT_TIMESTAMP',
  "primary" key(user_id,animal_id)
);

CREATE TABLE "care_schedule" (
  "id" integer PRIMARY KEY,
  "animal_id" integer NOT NULL,
  "activity" varchar(100),
  "hour" varchar(10),
  "frequency" varchar(50)
);

CREATE TABLE "care_resources" (
  "id" integer PRIMARY KEY,
  "animal_id" integer NOT NULL,
  "resource_type" varchar(50),
  "title" varchar(255),
  "content" text
);

CREATE TABLE "medical_history" (
  "id" integer PRIMARY KEY,
  "animal_id" integer NOT NULL,
  "description" text,
  "record_date" timestamp DEFAULT 'CURRENT_TIMESTAMP'
);

CREATE TABLE "media" (
  "id" integer PRIMARY KEY,
  "animal_id" integer NOT NULL,
  "type" varchar(20),
  "file_path" varchar(255)
);

CREATE TABLE "tags" (
  "id" integer PRIMARY KEY,
  "name" varchar(100) UNIQUE NOT NULL
);

CREATE TABLE "animal_tags" (
  "animal_id" integer NOT NULL,
  "tag_id" integer NOT NULL,
  "primary" key(animal_id,tag_id)
);

CREATE TABLE "user_preference_tags" (
  "user_id" integer NOT NULL,
  "tag_id" integer NOT NULL,
  "primary" key(user_id,tag_id)
);

CREATE TABLE "adoption_status_log" (
  "id" integer PRIMARY KEY,
  "adoption_id" integer NOT NULL,
  "status" varchar(50),
  "changed_at" timestamp DEFAULT 'CURRENT_TIMESTAMP'
);

ALTER TABLE "animals" ADD FOREIGN KEY ("address_id") REFERENCES "address" ("id");

ALTER TABLE "users" ADD FOREIGN KEY ("address_id") REFERENCES "address" ("id");

ALTER TABLE "adoptions" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "adoptions" ADD FOREIGN KEY ("animal_id") REFERENCES "animals" ("id");

ALTER TABLE "care_schedule" ADD FOREIGN KEY ("animal_id") REFERENCES "animals" ("id");

ALTER TABLE "care_resources" ADD FOREIGN KEY ("animal_id") REFERENCES "animals" ("id");

ALTER TABLE "medical_history" ADD FOREIGN KEY ("animal_id") REFERENCES "animals" ("id");

ALTER TABLE "media" ADD FOREIGN KEY ("animal_id") REFERENCES "animals" ("id");

ALTER TABLE "animal_tags" ADD FOREIGN KEY ("animal_id") REFERENCES "animals" ("id");

ALTER TABLE "animal_tags" ADD FOREIGN KEY ("tag_id") REFERENCES "tags" ("id");

ALTER TABLE "user_preference_tags" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "user_preference_tags" ADD FOREIGN KEY ("tag_id") REFERENCES "tags" ("id");

ALTER TABLE "favorites" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "favorites" ADD FOREIGN KEY ("animal_id") REFERENCES "animals" ("id");

ALTER TABLE "adoption_status_log" ADD FOREIGN KEY ("adoption_id") REFERENCES "adoptions" ("id");
