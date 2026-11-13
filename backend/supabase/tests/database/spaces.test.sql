begin;
create extension if not exists pgtap with schema extensions;

select plan(19);

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'spaces-a@test.dev', '{"username":"alice"}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'spaces-b@test.dev', '{"username":"bob"}'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'spaces-c@test.dev', '{"username":"carol"}');

select has_table('public', 'spaces', 'spaces table exists');
select has_table('public', 'space_invitations', 'space_invitations table exists');
select is(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.spaces'::regclass, 'public.space_invitations'::regclass)),
  true,
  'row level security is enabled on both tables'
);
select policies_are(
  'public', 'spaces',
  array['members can read their spaces'],
  'spaces only has the members read policy'
);
select policies_are(
  'public', 'space_invitations',
  array['invitee or owner can read invitations'],
  'space_invitations only has the invitee or owner read policy'
);

insert into public.spaces (id, kind, owner_id, name) values
  ('11111111-1111-1111-1111-111111111111', 'playlist', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Road trip');

select results_eq(
  $$ select visibility::text, access_mode::text from public.spaces
     where id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('public', 'everyone') $$,
  'a space is public and open to everyone by default'
);
select throws_ok(
  $$ insert into public.spaces (kind, owner_id, name)
     values ('event', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '   ') $$,
  '23514', null,
  'a space name cannot be blank'
);
select throws_ok(
  $$ insert into public.spaces (kind, owner_id, name)
     values ('event', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', repeat('a', 101)) $$,
  '23514', null,
  'a space name has 100 characters at most'
);

insert into public.space_invitations (space_id, user_id, invited_by) values
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

select throws_ok(
  $$ insert into public.space_invitations (space_id, user_id, invited_by)
     values ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  '23505', null,
  'a user is invited only once to a space'
);

select is(
  public.is_space_member('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  true,
  'the owner is a member'
);
select is(
  public.is_space_member('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  true,
  'an invited user is a member'
);
select is(
  public.is_space_member('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  false,
  'another user is not a member'
);

set local role authenticated;

set local request.jwt.claims to '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';
select isnt_empty(
  $$ select id from public.spaces where id = '11111111-1111-1111-1111-111111111111' $$,
  'an invited user reads the space'
);
select isnt_empty(
  $$ select user_id from public.space_invitations $$,
  'an invited user reads their own invitation'
);

set local request.jwt.claims to '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}';
select is_empty(
  $$ select id from public.spaces $$,
  'another user does not read the space directly'
);
select is_empty(
  $$ select user_id from public.space_invitations $$,
  'another user does not read invitations'
);
select throws_ok(
  $$ insert into public.spaces (kind, owner_id, name)
     values ('event', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Party') $$,
  '42501', null,
  'a user cannot write spaces directly'
);
select throws_ok(
  $$ insert into public.space_invitations (space_id, user_id, invited_by)
     values ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'cccccccc-cccc-cccc-cccc-cccccccccccc') $$,
  '42501', null,
  'a user cannot invite themselves directly'
);

reset role;

delete from auth.users where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select is_empty(
  $$ select 1 from public.space_invitations where space_id = '11111111-1111-1111-1111-111111111111' $$,
  'deleting the owner deletes the space and its invitations'
);

select * from finish();
rollback;
