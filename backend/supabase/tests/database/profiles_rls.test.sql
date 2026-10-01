begin;
create extension if not exists pgtap with schema extensions;

select plan(21);

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'rls-a@test.dev', '{"username":"alice"}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'rls-b@test.dev', '{"username":"bob"}');

-- Policies
select policies_are(
  'public', 'profiles',
  array['owner can read own profile', 'owner can update own profile'],
  'profiles only has the owner policies'
);
select policy_cmd_is('public', 'profiles', 'owner can read own profile', 'select', 'read policy applies to select');
select policy_roles_are('public', 'profiles', 'owner can read own profile', array['authenticated'], 'read policy targets authenticated');
select policy_cmd_is('public', 'profiles', 'owner can update own profile', 'update', 'update policy applies to update');
select policy_roles_are('public', 'profiles', 'owner can update own profile', array['authenticated'], 'update policy targets authenticated');

select is(
  public.are_friends('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  false,
  'are_friends is a stub returning false'
);

-- Authenticated as alice
set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select results_eq(
  $$ select username from public.profiles $$,
  $$ values ('alice'::text) $$,
  'a user only sees their own profile'
);
select lives_ok(
  $$ update public.profiles set bio = 'hello', avatar_url = 'https://example.com/a.png', username = 'alice_2'
     where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'a user can update the editable columns of their own profile'
);
select lives_ok(
  $$ update public.profiles set bio = 'hacked' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  'updating another profile silently affects no row'
);
select throws_ok(
  $$ update public.profiles set id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501', null,
  'id cannot be updated'
);
select throws_ok(
  $$ update public.profiles set created_at = now() where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501', null,
  'created_at cannot be updated'
);
select throws_ok(
  $$ update public.profiles set updated_at = now() where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501', null,
  'updated_at cannot be updated directly'
);
select throws_ok(
  $$ insert into public.profiles (id, username) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'alice_3') $$,
  '42501', null,
  'a user cannot insert a profile'
);
select throws_ok(
  $$ delete from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501', null,
  'a user cannot delete a profile'
);
select throws_ok(
  $$ truncate public.profiles $$,
  '42501', null,
  'a user cannot truncate profiles (truncate bypasses RLS)'
);
select throws_ok(
  $$ select public.handle_new_user() $$,
  '42501', null,
  'a user cannot call handle_new_user directly'
);

reset role;

select is(
  (select bio from public.profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  null,
  'the other profile was left untouched'
);

-- Anonymous visitor
set local role anon;

select throws_ok(
  $$ select * from public.profiles $$,
  '42501', null,
  'anon cannot read profiles'
);
select throws_ok(
  $$ select public.are_friends('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') $$,
  '42501', null,
  'anon cannot call are_friends'
);

reset role;

-- updated_at is refreshed by the trigger
alter table public.profiles disable trigger set_updated_at;
update public.profiles set updated_at = '2000-01-01' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
alter table public.profiles enable trigger set_updated_at;

set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
select lives_ok(
  $$ update public.profiles set bio = 'refreshed' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'a user can update their bio again'
);
reset role;

select is(
  (select updated_at from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  now(),
  'updated_at is refreshed on update'
);

select * from finish();
rollback;
