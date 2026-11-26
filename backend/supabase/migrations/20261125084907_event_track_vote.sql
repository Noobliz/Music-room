CREATE TYPE "public"."event_track_status" AS ENUM('queued', 'playing', 'played');--> statement-breakpoint
CREATE TABLE "event_track_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"proposed_by" uuid NOT NULL,
	"status" "event_track_status" DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_track_proposals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "event_track_votes" (
	"proposal_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_track_votes_pkey" PRIMARY KEY("proposal_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "event_track_votes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "event_track_proposals" ADD CONSTRAINT "event_track_proposals_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_track_proposals" ADD CONSTRAINT "event_track_proposals_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_track_proposals" ADD CONSTRAINT "event_track_proposals_proposed_by_users_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_track_votes" ADD CONSTRAINT "event_track_votes_proposal_id_event_track_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."event_track_proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_track_votes" ADD CONSTRAINT "event_track_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_track_proposals_active_track_idx" ON "event_track_proposals" USING btree ("space_id","track_id") WHERE "event_track_proposals"."status" in ('queued', 'playing');--> statement-breakpoint
CREATE INDEX "event_track_proposals_track_idx" ON "event_track_proposals" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "event_track_proposals_proposer_idx" ON "event_track_proposals" USING btree ("proposed_by");--> statement-breakpoint
CREATE INDEX "event_track_votes_user_idx" ON "event_track_votes" USING btree ("user_id");--> statement-breakpoint
CREATE POLICY "members can read event track proposals" ON "event_track_proposals" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_space_member("event_track_proposals"."space_id", (select auth.uid())));--> statement-breakpoint
CREATE POLICY "members can read event track votes" ON "event_track_votes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1 from public.event_track_proposals proposal
        where proposal.id = "event_track_votes"."proposal_id"
          and public.is_space_member(proposal.space_id, (select auth.uid()))
      ));