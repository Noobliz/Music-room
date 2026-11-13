CREATE TYPE "public"."space_access_mode" AS ENUM('everyone', 'invited_only');--> statement-breakpoint
CREATE TYPE "public"."space_kind" AS ENUM('event', 'playlist');--> statement-breakpoint
CREATE TYPE "public"."space_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TABLE "space_invitations" (
	"space_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"invited_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "space_invitations_pkey" PRIMARY KEY("space_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "space_invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "space_kind" NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"visibility" "space_visibility" DEFAULT 'public' NOT NULL,
	"access_mode" "space_access_mode" DEFAULT 'everyone' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spaces_name_not_blank" CHECK (btrim("spaces"."name") <> ''),
	CONSTRAINT "spaces_name_length" CHECK (char_length("spaces"."name") <= 100),
	CONSTRAINT "spaces_description_length" CHECK (char_length("spaces"."description") <= 500)
);
--> statement-breakpoint
ALTER TABLE "spaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "space_invitations" ADD CONSTRAINT "space_invitations_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_invitations" ADD CONSTRAINT "space_invitations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_invitations" ADD CONSTRAINT "space_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "space_invitations_user_idx" ON "space_invitations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "spaces_owner_idx" ON "spaces" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "spaces_visibility_kind_idx" ON "spaces" USING btree ("visibility","kind");