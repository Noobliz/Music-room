ALTER TYPE "public"."space_access_mode" ADD VALUE 'location_time';--> statement-breakpoint
CREATE TABLE "event_vote_zones" (
	"space_id" uuid PRIMARY KEY NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"radius_meters" integer NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"time_zone" text NOT NULL,
	CONSTRAINT "event_vote_zones_latitude_range" CHECK ("event_vote_zones"."latitude" between -90 and 90),
	CONSTRAINT "event_vote_zones_longitude_range" CHECK ("event_vote_zones"."longitude" between -180 and 180),
	CONSTRAINT "event_vote_zones_radius_range" CHECK ("event_vote_zones"."radius_meters" between 10 and 50000),
	CONSTRAINT "event_vote_zones_slot_order" CHECK ("event_vote_zones"."ends_at" > "event_vote_zones"."starts_at")
);
--> statement-breakpoint
ALTER TABLE "event_vote_zones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "event_vote_zones" ADD CONSTRAINT "event_vote_zones_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "members can read event vote zones" ON "event_vote_zones" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_space_member("event_vote_zones"."space_id", (select auth.uid())));