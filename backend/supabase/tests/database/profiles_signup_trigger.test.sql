begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

select has_trigger('auth', 'users', 'on_auth_user_created', 'signup trigger exists on auth.users');
select trigger_is('auth', 'users', 'on_auth_user_created', 'public', 'handle_new_user', 'signup trigger calls handle_new_user');
select is_definer('public', 'handle_new_user', array[]::name[], 'handle_new_user runs as security definer');

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'signup-a@test.dev', '{"username":"Alice"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'signup-b@test.dev', '{}');

select is(
  (select count(*) from public.profiles where id in ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002')),
  2::bigint,
  'a profile is created for each new auth user'
);
select is(
  (select username from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Alice',
  'username comes from the signup metadata'
);
select is(
  (select username from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  'user_bbbbbbbb',
  'username is generated from the user id when metadata has none'
);

insert into auth.users (id, email, raw_user_meta_data) values
  ('cccccccc-0000-0000-0000-000000000003', 'signup-c@test.dev', '{"username":"bad name!"}'),
  ('dddddddd-0000-0000-0000-000000000004', 'signup-d@test.dev', '{"username":"  spaced  "}');

select is(
  (select username from public.profiles where id = 'cccccccc-0000-0000-0000-000000000003'),
  'user_cccccccc',
  'an invalid metadata username falls back to a generated one'
);
select is(
  (select username from public.profiles where id = 'dddddddd-0000-0000-0000-000000000004'),
  'spaced',
  'surrounding whitespace is trimmed from the metadata username'
);

insert into auth.users (id, email, raw_user_meta_data) values
  ('eeeeeeee-0000-0000-0000-000000000005', 'signup-e@test.dev', '{"username":"alice"}');
insert into auth.users (id, email, raw_user_meta_data) values
  ('ffffffff-0000-0000-0000-000000000006', 'signup-f@test.dev', '{"username":"ALICE"}');

select is(
  (select username from public.profiles where id = 'eeeeeeee-0000-0000-0000-000000000005'),
  'alice_1',
  'a username taken with another case gets a numeric suffix'
);
select is(
  (select username from public.profiles where id = 'ffffffff-0000-0000-0000-000000000006'),
  'ALICE_2',
  'the suffix increments until the username is free'
);

insert into auth.users (id, email, raw_user_meta_data) values
  ('12121212-0000-0000-0000-000000000007', 'signup-g@test.dev', '{"username":"abcdefghijabcdefghijabcdefghij"}');
insert into auth.users (id, email, raw_user_meta_data) values
  ('13131313-0000-0000-0000-000000000008', 'signup-h@test.dev', '{"username":"ABCDEFGHIJabcdefghijabcdefghij"}');

select is(
  (select username from public.profiles where id = '13131313-0000-0000-0000-000000000008'),
  'ABCDEFGHIJabcdefghijabcdefgh_1',
  'a 30-character username is truncated to fit the suffix'
);

select * from finish();
rollback;
