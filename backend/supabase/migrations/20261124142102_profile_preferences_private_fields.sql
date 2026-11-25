CREATE TYPE "public"."music_genre" AS ENUM('pop', 'rock', 'hip_hop', 'rnb', 'electronic', 'jazz', 'classical', 'metal', 'folk', 'reggae', 'blues', 'country', 'soul', 'latin', 'world');--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "music_genres" "music_genre"[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "full_name" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "birth_date" date;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_full_name_length" CHECK (char_length("profiles"."full_name") <= 100);--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_birth_date_min" CHECK ("profiles"."birth_date" >= '1900-01-01');