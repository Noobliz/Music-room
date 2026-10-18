create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.friendships
    where status = 'accepted'
      and least(requester_id, addressee_id) = least(a, b)
      and greatest(requester_id, addressee_id) = greatest(a, b)
  );
$$;
--> statement-breakpoint
revoke all on table public.friendships from anon, authenticated;
--> statement-breakpoint
grant select on table public.friendships to authenticated;
