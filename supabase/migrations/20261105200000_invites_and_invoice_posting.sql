-- Workspace email invites + link approved invoices to journal entries.

create table public.strata_pending_invites (
  strata_id uuid not null
    references public.strata_corporations(id) on delete cascade,
  email text not null check (char_length(trim(email)) between 3 and 254),
  role public.strata_member_role not null default 'member',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (strata_id, email)
);

create index strata_pending_invites_email_idx
  on public.strata_pending_invites (lower(email));

alter table public.strata_pending_invites enable row level security;

alter table public.invoices
  add column if not exists journal_entry_id uuid;

alter table public.invoices
  drop constraint if exists invoices_journal_entry_id_fkey;

alter table public.invoices
  add constraint invoices_journal_entry_id_fkey
  foreign key (journal_entry_id, strata_id)
  references public.journal_entries(id, strata_id)
  on delete set null;

create or replace function public.accept_strata_pending_invites()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_email text;
  accepted_count integer := 0;
  invite record;
begin
  if actor_id is null then
    raise exception 'Sign in to accept workspace invitations';
  end if;

  select lower(u.email) into actor_email
  from auth.users u
  where u.id = actor_id;

  if actor_email is null then
    return 0;
  end if;

  for invite in
    select pi.strata_id, pi.role
    from public.strata_pending_invites pi
    where lower(pi.email) = actor_email
  loop
    insert into public.strata_memberships (strata_id, user_id, role, status)
    values (invite.strata_id, actor_id, invite.role, 'active')
    on conflict (strata_id, user_id) do update
      set role = excluded.role, status = 'active';

    delete from public.strata_pending_invites pi
    where pi.strata_id = invite.strata_id
      and lower(pi.email) = actor_email;

    accepted_count := accepted_count + 1;
  end loop;

  return accepted_count;
end;
$$;

revoke all on function public.accept_strata_pending_invites() from public;
grant execute on function public.accept_strata_pending_invites() to authenticated;

revoke all on table public.strata_pending_invites from anon, authenticated;
grant all on table public.strata_pending_invites to service_role;
