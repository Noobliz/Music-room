begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'friends-a@test.dev', '{"username":"alice"}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'friends-b@test.dev', '{"username":"bob"}'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'friends-c@test.dev', '{"username":"carol"}');

select has_table('public', 'friendships', 'friendships table exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.friendships'::regclass),
  true,
  'row level security is enabled'
);
select policies_are(
  'public', 'friendships',
  array['participants can read their friendships'],
  'friendships only has the participants read policy'
);

select throws_ok(
  $$ insert into public.friendships (requester_id, addressee_id)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  '23514', null,
  'a user cannot befriend themselves'
);
select lives_ok(
  $$ insert into public.friendships (id, requester_id, addressee_id)
     values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') $$,
  'a friend request can be created'
);
select throws_ok(
  $$ insert into public.friendships (requester_id, addressee_id)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') $$,
  '23505', null,
  'the same request cannot be sent twice'
);
select throws_ok(
  $$ insert into public.friendships (requester_id, addressee_id)
     values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  '23505', null,
  'only one relationship per pair, whatever the direction'
);
select throws_ok(
  $$ update public.friendships set status = 'accepted' where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null,
  'an accepted friendship needs an accepted_at date'
);

select is(
  public.are_friends('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  false,
  'are_friends is false while the request is pending'
);

update public.friendships set status = 'accepted', accepted_at = now()
  where id = '11111111-1111-1111-1111-111111111111';

select is(
  public.are_friends('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  true,
  'are_friends is true once accepted'
);
select is(
  public.are_friends('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  true,
  'are_friends is symmetric'
);
select is(
  public.are_friends('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  false,
  'are_friends is false without a relationship'
);

set local role authenticated;
set local request.jwt.claims to '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}';

select is_empty(
  $$ select id from public.friendships $$,
  'a user does not see relationships of other users'
);
select throws_ok(
  $$ insert into public.friendships (requester_id, addressee_id)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  '42501', null,
  'a user cannot write friendships directly'
);

set local request.jwt.claims to '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select results_eq(
  $$ select id from public.friendships $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid) $$,
  'a user sees the relationships they are part of'
);

reset role;
set local role anon;

select throws_ok(
  $$ select * from public.friendships $$,
  '42501', null,
  'anon cannot read friendships'
);

reset role;

delete from auth.users where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

select is_empty(
  $$ select id from public.friendships where id = '11111111-1111-1111-1111-111111111111' $$,
  'deleting a user deletes their friendships'
);

select * from finish();
rollback;
