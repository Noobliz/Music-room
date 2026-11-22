insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000',
  seed.id,
  'authenticated',
  'authenticated',
  seed.email,
  extensions.crypt('Password123!', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('username', seed.username),
  now(),
  now(),
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  ''
from (values
  ('d0000000-0000-4000-8000-000000000001'::uuid, 'dev@music-room.test', 'dev_user'),
  ('d0000000-0000-4000-8000-000000000002'::uuid, 'friend@music-room.test', 'friend_user')
) as seed (id, email, username)
on conflict do nothing;

insert into auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  users.id,
  users.id::text,
  'email',
  jsonb_build_object('sub', users.id::text, 'email', users.email, 'email_verified', true),
  now(),
  now(),
  now()
from auth.users as users
where users.id in ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002')
on conflict do nothing;
