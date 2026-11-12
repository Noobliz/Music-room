CREATE TABLE "tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"album" text,
	"duration_ms" integer NOT NULL,
	"audio_path" text NOT NULL,
	"cover_path" text,
	"content_hash" text NOT NULL,
	"license" text,
	"attribution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tracks_audio_path_key" UNIQUE("audio_path"),
	CONSTRAINT "tracks_content_hash_key" UNIQUE("content_hash"),
	CONSTRAINT "tracks_duration_positive" CHECK ("tracks"."duration_ms" > 0),
	CONSTRAINT "tracks_title_not_blank" CHECK (btrim("tracks"."title") <> ''),
	CONSTRAINT "tracks_artist_not_blank" CHECK (btrim("tracks"."artist") <> '')
);
--> statement-breakpoint
ALTER TABLE "tracks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "authenticated users can read tracks" ON "tracks" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);