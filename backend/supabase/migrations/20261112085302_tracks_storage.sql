-- Custom SQL migration: catalog table privileges and the tracks / covers Storage buckets.
-- Not expressible with the Drizzle schema, so it is maintained by hand.
revoke all on table public.tracks from anon, authenticated;
--> statement-breakpoint
grant select on table public.tracks to authenticated;
--> statement-breakpoint
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tracks', 'tracks', false, 52428800, array['audio/mpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
--> statement-breakpoint
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
--> statement-breakpoint
create policy "authenticated users can read tracks audio"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'tracks');
