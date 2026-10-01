-- Custom SQL migration: profile triggers, friendship stub and column privileges.
-- Not expressible with the Drizzle schema, so it is maintained by hand.

-- Friendship check used by profile visibility rules. Stub until JLO-111 implements friendships.
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select false;
$$;
--> statement-breakpoint
revoke execute on function public.are_friends(uuid, uuid) from public, anon;
--> statement-breakpoint
grant execute on function public.are_friends(uuid, uuid) to authenticated;
--> statement-breakpoint

-- Creates the profile of every new auth user. Username comes from the signup metadata when valid,
-- otherwise it is generated (OAuth signups). Collisions get a numeric suffix so signup never fails on it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_username text := btrim(new.raw_user_meta_data ->> 'username');
  candidate text;
  attempt int := 0;
begin
  if base_username is null or base_username !~ '^[a-zA-Z0-9_.]{3,30}$' then
    base_username := 'user_' || left(new.id::text, 8);
  end if;

  candidate := base_username;
  loop
    begin
      insert into public.profiles (id, username) values (new.id, candidate);
      return new;
    exception when unique_violation then
      attempt := attempt + 1;
      if attempt > 20 then
        raise exception 'could not generate a unique username for user %', new.id;
      end if;
      candidate := left(base_username, 30 - length(attempt::text) - 1) || '_' || attempt;
    end;
  end loop;
end;
$$;
--> statement-breakpoint
revoke execute on function public.handle_new_user() from public, anon, authenticated;
--> statement-breakpoint
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
--> statement-breakpoint

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
--> statement-breakpoint
create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
--> statement-breakpoint

-- Supabase grants every privilege (including TRUNCATE, which bypasses RLS) to anon and
-- authenticated on new public tables. Keep only owner reads and edits of user-facing columns.
revoke all on table public.profiles from anon, authenticated;
--> statement-breakpoint
grant select on table public.profiles to authenticated;
--> statement-breakpoint
grant update (username, avatar_url, bio) on table public.profiles to authenticated;
