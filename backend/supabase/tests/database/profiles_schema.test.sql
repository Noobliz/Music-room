begin;
create extension if not exists pgtap with schema extensions;

select plan(30);

-- Table and columns
select has_table('public', 'profiles', 'profiles table exists');
select columns_are(
  'public', 'profiles',
  array['id', 'username', 'avatar_url', 'bio', 'created_at', 'updated_at'],
  'profiles has the expected columns'
);
select col_is_pk('public', 'profiles', 'id', 'id is the primary key');
select col_type_is('public', 'profiles', 'id', 'uuid', 'id is uuid');
select col_type_is('public', 'profiles', 'username', 'text', 'username is text');
select col_not_null('public', 'profiles', 'username', 'username is not null');
select col_type_is('public', 'profiles', 'avatar_url', 'text', 'avatar_url is text');
select col_is_null('public', 'profiles', 'avatar_url', 'avatar_url is nullable');
select col_type_is('public', 'profiles', 'bio', 'text', 'bio is text');
select col_is_null('public', 'profiles', 'bio', 'bio is nullable');
select col_type_is('public', 'profiles', 'created_at', 'timestamp with time zone', 'created_at is timestamptz');
select col_not_null('public', 'profiles', 'created_at', 'created_at is not null');
select col_default_is('public', 'profiles', 'created_at', 'now()', 'created_at defaults to now()');
select col_type_is('public', 'profiles', 'updated_at', 'timestamp with time zone', 'updated_at is timestamptz');
select col_not_null('public', 'profiles', 'updated_at', 'updated_at is not null');
select col_default_is('public', 'profiles', 'updated_at', 'now()', 'updated_at defaults to now()');

-- Link to Supabase Auth
select fk_ok('public', 'profiles', 'id', 'auth', 'users', 'id', 'id references auth.users(id)');
select is(
  (select confdeltype from pg_constraint where conname = 'profiles_id_users_id_fk' and conrelid = 'public.profiles'::regclass),
  'c'::"char",
  'deleting an auth user cascades to its profile'
);

-- Row level security
select is(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  true,
  'row level security is enabled'
);

-- Username uniqueness and format, bio length
select has_index('public', 'profiles', 'profiles_username_lower_idx', 'case-insensitive username index exists');
select index_is_unique('public', 'profiles', 'profiles_username_lower_idx', 'username index is unique');

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'schema-a@test.dev', '{"username":"Alice"}'),
  ('22222222-2222-2222-2222-222222222222', 'schema-b@test.dev', '{"username":"bob"}');

select throws_ok(
  $$ update public.profiles set username = 'ALICE' where id = '22222222-2222-2222-2222-222222222222' $$,
  '23505', null,
  'username is unique regardless of case'
);
select throws_ok(
  $$ update public.profiles set username = 'ab' where id = '22222222-2222-2222-2222-222222222222' $$,
  '23514', null,
  'username shorter than 3 characters is rejected'
);
select throws_ok(
  $$ update public.profiles set username = repeat('a', 31) where id = '22222222-2222-2222-2222-222222222222' $$,
  '23514', null,
  'username longer than 30 characters is rejected'
);
select throws_ok(
  $$ update public.profiles set username = 'bad name!' where id = '22222222-2222-2222-2222-222222222222' $$,
  '23514', null,
  'username with forbidden characters is rejected'
);
select lives_ok(
  $$ update public.profiles set username = 'Bob_2.0' where id = '22222222-2222-2222-2222-222222222222' $$,
  'username with letters, digits, underscore and dot is accepted'
);
select throws_ok(
  $$ update public.profiles set bio = repeat('x', 501) where id = '22222222-2222-2222-2222-222222222222' $$,
  '23514', null,
  'bio longer than 500 characters is rejected'
);
select lives_ok(
  $$ update public.profiles set bio = repeat('x', 500) where id = '22222222-2222-2222-2222-222222222222' $$,
  'bio of 500 characters is accepted'
);
select lives_ok(
  $$ update public.profiles set bio = null, avatar_url = null where id = '22222222-2222-2222-2222-222222222222' $$,
  'bio and avatar_url can be cleared'
);

select throws_ok(
  $$ insert into public.profiles (id, username) values ('99999999-9999-9999-9999-999999999999', 'ghost') $$,
  '23503', null,
  'a profile cannot exist without an auth user'
);

select * from finish();
rollback;
