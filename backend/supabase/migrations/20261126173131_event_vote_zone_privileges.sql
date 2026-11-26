-- Custom SQL migration file, put your code below! --
revoke all on table public.event_vote_zones from anon, authenticated;
--> statement-breakpoint
grant select on table public.event_vote_zones to authenticated;
