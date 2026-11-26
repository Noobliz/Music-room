-- Custom SQL migration file, put your code below! --
revoke all on table public.event_track_proposals from anon, authenticated;
--> statement-breakpoint
grant select on table public.event_track_proposals to authenticated;
--> statement-breakpoint
revoke all on table public.event_track_votes from anon, authenticated;
--> statement-breakpoint
grant select on table public.event_track_votes to authenticated;
