begin;
create extension if not exists pgtap with schema extensions;

select plan(27);

select has_table('public', 'event_track_proposals', 'event track proposals table exists');
select has_table('public', 'event_track_votes', 'event track votes table exists');
select is(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.event_track_proposals'::regclass, 'public.event_track_votes'::regclass)),
  true,
  'row level security is enabled on proposals and votes'
);
select policies_are(
  'public', 'event_track_proposals',
  array['members can read event track proposals'],
  'proposals only have a member read policy'
);
select policies_are(
  'public', 'event_track_votes',
  array['members can read event track votes'],
  'votes only have a member read policy'
);
select table_privs_are('public', 'event_track_proposals', 'anon', array[]::text[], 'anon cannot access proposals');
select table_privs_are('public', 'event_track_proposals', 'authenticated', array['SELECT'], 'users can only read proposals');
select table_privs_are('public', 'event_track_votes', 'anon', array[]::text[], 'anon cannot access votes');
select table_privs_are('public', 'event_track_votes', 'authenticated', array['SELECT'], 'users can only read votes');

insert into auth.users (id, email, raw_user_meta_data) values
  ('d1111111-1111-1111-1111-111111111111', 'vote-owner@test.dev', '{"username":"vote_owner"}'),
  ('d2222222-2222-2222-2222-222222222222', 'vote-invited@test.dev', '{"username":"vote_invited"}'),
  ('d3333333-3333-3333-3333-333333333333', 'vote-outsider@test.dev', '{"username":"vote_outsider"}');

insert into public.spaces (id, kind, owner_id, name, visibility) values
  ('e1111111-1111-1111-1111-111111111111', 'event', 'd1111111-1111-1111-1111-111111111111', 'Vote test', 'private'),
  ('e2222222-2222-2222-2222-222222222222', 'event', 'd1111111-1111-1111-1111-111111111111', 'Other event', 'private');
insert into public.space_invitations (space_id, user_id, invited_by) values
  ('e1111111-1111-1111-1111-111111111111', 'd2222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111');
insert into public.tracks (id, title, artist, duration_ms, audio_path, content_hash) values
  ('f1111111-1111-1111-1111-111111111111', 'First song', 'Test artist', 1000, 'vote-first.mp3', 'vote-first'),
  ('f2222222-2222-2222-2222-222222222222', 'Second song', 'Test artist', 1000, 'vote-second.mp3', 'vote-second');
insert into public.event_track_proposals (id, space_id, track_id, proposed_by) values
  ('a1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111'),
  ('a3333333-3333-3333-3333-333333333333', 'e2222222-2222-2222-2222-222222222222', 'f1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111');

select is(
  (select count(*)::integer from public.event_track_proposals where status = 'queued' and track_id = 'f1111111-1111-1111-1111-111111111111'),
  2,
  'the same track can be active in different events'
);

select is(
  (select status::text from public.event_track_proposals where id = 'a1111111-1111-1111-1111-111111111111'),
  'queued',
  'a new proposal enters the queue'
);
select throws_ok(
  $$ insert into public.event_track_proposals (space_id, track_id, proposed_by)
     values ('e1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'd2222222-2222-2222-2222-222222222222') $$,
  '23505', null,
  'an active track cannot be proposed twice in one event'
);

update public.event_track_proposals set status = 'played' where id = 'a1111111-1111-1111-1111-111111111111';
insert into public.event_track_proposals (id, space_id, track_id, proposed_by) values
  ('a2222222-2222-2222-2222-222222222222', 'e1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'd2222222-2222-2222-2222-222222222222');
select is(
  (select count(*)::integer from public.event_track_proposals where space_id = 'e1111111-1111-1111-1111-111111111111' and track_id = 'f1111111-1111-1111-1111-111111111111'),
  2,
  'a played track can be proposed again'
);

update public.event_track_proposals set status = 'playing' where id = 'a2222222-2222-2222-2222-222222222222';
select throws_ok(
  $$ insert into public.event_track_proposals (space_id, track_id, proposed_by)
     values ('e1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111') $$,
  '23505', null,
  'a playing track cannot also be queued'
);
update public.event_track_proposals set status = 'queued' where id = 'a2222222-2222-2222-2222-222222222222';

select throws_ok(
  $$ insert into public.event_track_proposals (space_id, track_id, proposed_by)
     values ('e1111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'd1111111-1111-1111-1111-111111111111') $$,
  '23503', null,
  'a proposal needs a catalog track'
);

insert into public.event_track_votes (proposal_id, user_id) values
  ('a2222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111'),
  ('a2222222-2222-2222-2222-222222222222', 'd2222222-2222-2222-2222-222222222222');
select throws_ok(
  $$ insert into public.event_track_votes (proposal_id, user_id)
     values ('aaaaaaaa-ffff-ffff-ffff-ffffffffffff', 'd1111111-1111-1111-1111-111111111111') $$,
  '23503', null,
  'a vote needs an existing proposal'
);
select throws_ok(
  $$ insert into public.event_track_votes (proposal_id, user_id)
     values ('a2222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111') $$,
  '23505', null,
  'a user has only one vote per proposal'
);
select is(
  (select count(*)::integer from public.event_track_votes where proposal_id = 'a2222222-2222-2222-2222-222222222222'),
  2,
  'distinct users add distinct votes'
);

set local role authenticated;
set local request.jwt.claims to '{"sub":"d2222222-2222-2222-2222-222222222222","role":"authenticated"}';
select isnt_empty(
  $$ select id from public.event_track_proposals where id = 'a2222222-2222-2222-2222-222222222222' $$,
  'an invited user can read proposals'
);
select isnt_empty(
  $$ select user_id from public.event_track_votes where proposal_id = 'a2222222-2222-2222-2222-222222222222' $$,
  'an invited user can read votes'
);

set local request.jwt.claims to '{"sub":"d3333333-3333-3333-3333-333333333333","role":"authenticated"}';
select is_empty(
  $$ select id from public.event_track_proposals $$,
  'a non-member cannot read private event proposals'
);
select is_empty(
  $$ select proposal_id from public.event_track_votes $$,
  'a non-member cannot read private event votes'
);
select throws_ok(
  $$ insert into public.event_track_proposals (space_id, track_id, proposed_by)
     values ('e1111111-1111-1111-1111-111111111111', 'f2222222-2222-2222-2222-222222222222', 'd3333333-3333-3333-3333-333333333333') $$,
  '42501', null,
  'users cannot write proposals directly'
);
select throws_ok(
  $$ insert into public.event_track_votes (proposal_id, user_id)
     values ('a2222222-2222-2222-2222-222222222222', 'd3333333-3333-3333-3333-333333333333') $$,
  '42501', null,
  'users cannot write votes directly'
);

reset role;
delete from public.spaces where id = 'e1111111-1111-1111-1111-111111111111';
select is_empty(
  $$ select id from public.event_track_proposals where space_id = 'e1111111-1111-1111-1111-111111111111' $$,
  'deleting an event removes its proposals'
);
select is_empty(
  $$ select proposal_id from public.event_track_votes where proposal_id = 'a2222222-2222-2222-2222-222222222222' $$,
  'deleting an event removes its votes'
);
select isnt_empty(
  $$ select id from public.event_track_proposals where space_id = 'e2222222-2222-2222-2222-222222222222' $$,
  'deleting an event keeps proposals from other events'
);

select * from finish();
rollback;
