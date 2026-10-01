begin;
create extension if not exists pgtap with schema extensions;

select plan(2);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'cascade@test.dev', '{"username":"leaving"}');

select isnt_empty(
  $$ select 1 from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  'the profile exists before the auth user is deleted'
);

delete from auth.users where id = '11111111-1111-1111-1111-111111111111';

select is_empty(
  $$ select 1 from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  'deleting the auth user deletes its profile'
);

select * from finish();
rollback;
