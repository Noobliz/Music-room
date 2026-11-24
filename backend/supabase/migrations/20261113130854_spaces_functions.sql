create or replace function public.is_space_owner(space_id uuid, user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.spaces
    where id = is_space_owner.space_id
      and owner_id = is_space_owner.user_id
  );
$$;
--> statement-breakpoint
create or replace function public.is_space_member(space_id uuid, user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.spaces
    where id = is_space_member.space_id
      and owner_id = is_space_member.user_id
  ) or exists (
    select 1
    from public.space_invitations
    where space_invitations.space_id = is_space_member.space_id
      and space_invitations.user_id = is_space_member.user_id
  );
$$;
--> statement-breakpoint
revoke execute on function public.is_space_owner(uuid, uuid) from public, anon;
--> statement-breakpoint
grant execute on function public.is_space_owner(uuid, uuid) to authenticated;
--> statement-breakpoint
revoke execute on function public.is_space_member(uuid, uuid) from public, anon;
--> statement-breakpoint
grant execute on function public.is_space_member(uuid, uuid) to authenticated;
--> statement-breakpoint
create trigger set_updated_at
  before update on public.spaces
  for each row execute function public.set_updated_at();
--> statement-breakpoint
revoke all on table public.spaces from anon, authenticated;
--> statement-breakpoint
grant select on table public.spaces to authenticated;
--> statement-breakpoint
revoke all on table public.space_invitations from anon, authenticated;
--> statement-breakpoint
grant select on table public.space_invitations to authenticated;
