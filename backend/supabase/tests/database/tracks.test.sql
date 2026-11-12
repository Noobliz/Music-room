begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

select has_table('public', 'tracks', 'tracks table exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.tracks'::regclass),
  true,
  'row level security is enabled'
);
select policies_are(
  'public', 'tracks',
  array['authenticated users can read tracks'],
  'tracks only has the read policy'
);
select table_privs_are('public', 'tracks', 'anon', array[]::text[], 'anon has no access to tracks');
select table_privs_are('public', 'tracks', 'authenticated', array['SELECT'], 'authenticated can only read tracks');

select is(
  (select public from storage.buckets where id = 'tracks'),
  false,
  'the tracks bucket is private'
);
select is(
  (select public from storage.buckets where id = 'covers'),
  true,
  'the covers bucket is public'
);

insert into public.tracks (id, title, artist, duration_ms, audio_path, content_hash)
values ('11111111-1111-1111-1111-111111111111', 'Song', 'Artist', 1000, 'a.mp3', 'a');

select throws_ok(
  $$ insert into public.tracks (title, artist, duration_ms, audio_path, content_hash)
     values ('Song', 'Artist', 1000, 'b.mp3', 'a') $$,
  '23505', null,
  'the same audio file cannot be imported twice'
);
select throws_ok(
  $$ insert into public.tracks (title, artist, duration_ms, audio_path, content_hash)
     values ('Song', 'Artist', 0, 'c.mp3', 'c') $$,
  '23514', null,
  'a track needs a positive duration'
);

set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select throws_ok(
  $$ insert into public.tracks (title, artist, duration_ms, audio_path, content_hash)
     values ('Song', 'Artist', 1000, 'd.mp3', 'd') $$,
  '42501', null,
  'users cannot add tracks'
);

select * from finish();
rollback;
