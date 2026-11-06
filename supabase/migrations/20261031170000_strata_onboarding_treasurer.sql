drop policy if exists "Admins can add strata members" on public.strata_memberships;
create policy "Admins can add strata members"
  on public.strata_memberships for insert to authenticated
  with check (
    public.has_strata_role(strata_id, array['admin'])
    and role in ('admin', 'council', 'treasurer', 'member', 'auditor')
  );

drop policy if exists "Admins can update other memberships" on public.strata_memberships;
create policy "Admins can update other memberships"
  on public.strata_memberships for update to authenticated
  using (
    user_id <> (select auth.uid())
    and public.has_strata_role(strata_id, array['admin'])
  )
  with check (
    user_id <> (select auth.uid())
    and public.has_strata_role(strata_id, array['admin'])
    and role in ('admin', 'council', 'treasurer', 'member', 'auditor')
  );

create or replace function public.create_strata_workspace(
  p_strata_number text,
  p_name text,
  p_city text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  creator_id uuid := auth.uid();
  new_strata_id uuid;
begin
  if creator_id is null then
    raise exception 'Sign in is required to create a workspace';
  end if;
  if char_length(trim(coalesce(p_strata_number, ''))) not between 1 and 30
    or char_length(trim(coalesce(p_name, ''))) not between 1 and 120
    or char_length(trim(coalesce(p_city, ''))) > 100 then
    raise exception 'Workspace details are invalid';
  end if;

  insert into public.strata_corporations (strata_number, name, city)
  values (
    trim(p_strata_number),
    trim(p_name),
    nullif(trim(coalesce(p_city, '')), '')
  )
  returning id into new_strata_id;

  insert into public.strata_memberships (strata_id, user_id, role, status)
  values (new_strata_id, creator_id, 'admin', 'active');

  return new_strata_id;
end;
$$;

create or replace function public.strata_onboarding_is_ready()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select true;
$$;

create or replace function public.list_strata_members(target_strata_id uuid)
returns table (
  user_id uuid,
  email text,
  role public.strata_member_role,
  status text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_strata_role(target_strata_id, array['admin']) then
    raise exception 'Administrator access is required to manage members';
  end if;

  return query
  select membership.user_id, auth_user.email::text, membership.role,
    membership.status, membership.created_at
  from public.strata_memberships membership
  join auth.users auth_user on auth_user.id = membership.user_id
  where membership.strata_id = target_strata_id
  order by membership.created_at, auth_user.email;
end;
$$;

create or replace function public.add_strata_member_by_email(
  target_strata_id uuid,
  member_email text,
  member_role public.strata_member_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_user_id uuid;
begin
  if actor_id is null
    or not public.has_strata_role(target_strata_id, array['admin']) then
    raise exception 'Administrator access is required to manage members';
  end if;
  if char_length(trim(coalesce(member_email, ''))) not between 3 and 254
    or position('@' in trim(member_email)) < 2 then
    raise exception 'Enter a valid account email';
  end if;

  select auth_user.id into target_user_id
  from auth.users auth_user
  where lower(auth_user.email) = lower(trim(member_email))
  limit 1;

  if target_user_id is null then
    raise exception 'No registered account was found for this email';
  end if;
  if target_user_id = actor_id then
    raise exception 'Administrators cannot change their own membership here';
  end if;

  insert into public.strata_memberships (strata_id, user_id, role, status)
  values (target_strata_id, target_user_id, member_role, 'active')
  on conflict (strata_id, user_id) do update
    set role = excluded.role, status = 'active';
end;
$$;

revoke all on function public.create_strata_workspace(text, text, text) from public;
revoke all on function public.strata_onboarding_is_ready() from public;
revoke all on function public.list_strata_members(uuid) from public;
revoke all on function public.add_strata_member_by_email(
  uuid, text, public.strata_member_role
) from public;
grant execute on function public.create_strata_workspace(text, text, text) to authenticated;
grant execute on function public.strata_onboarding_is_ready() to authenticated;
grant execute on function public.list_strata_members(uuid) to authenticated;
grant execute on function public.add_strata_member_by_email(
  uuid, text, public.strata_member_role
) to authenticated;

create or replace function public.can_access_strata_invoice_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with folders as (
    select storage.foldername(object_name) as parts
  )
  select case
    when array_length(parts, 1) >= 3
      and parts[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and parts[2] = 'invoices'
      and parts[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.has_strata_role(parts[1]::uuid, array['admin', 'council', 'treasurer'])
    else false
  end
  from folders;
$$;

create or replace function public.can_read_strata_invoice_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with folders as (
    select storage.foldername(object_name) as parts
  )
  select case
    when array_length(parts, 1) >= 3
      and parts[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and parts[2] = 'invoices'
      and parts[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.has_strata_role(
      parts[1]::uuid, array['admin', 'council', 'treasurer', 'auditor']
    )
    else false
  end
  from folders;
$$;

revoke all on function public.can_access_strata_invoice_object(text) from public;
revoke all on function public.can_read_strata_invoice_object(text) from public;
grant execute on function public.can_access_strata_invoice_object(text) to authenticated;
grant execute on function public.can_read_strata_invoice_object(text) to authenticated;

drop policy if exists "Council can read private invoice files" on storage.objects;
create policy "Finance roles and auditors can read private invoice files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'strata-invoices'
    and public.can_read_strata_invoice_object(name)
  );

drop policy if exists "Council can read invoices" on public.invoices;
drop policy if exists "Council can add invoices" on public.invoices;
drop policy if exists "Council can review invoices" on public.invoices;
create policy "Finance roles and auditors can read invoices"
  on public.invoices for select to authenticated
  using (public.has_strata_role(
    strata_id, array['admin', 'council', 'treasurer', 'auditor']
  ));
create policy "Finance roles can add invoices"
  on public.invoices for insert to authenticated
  with check (
    public.has_strata_role(strata_id, array['admin', 'council', 'treasurer'])
    and created_by = (select auth.uid())
  );
create policy "Finance roles can review invoices"
  on public.invoices for update to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council', 'treasurer']))
  with check (public.has_strata_role(strata_id, array['admin', 'council', 'treasurer']));

drop policy if exists "Council can manage ledger accounts" on public.ledger_accounts;
create policy "Finance roles can manage ledger accounts"
  on public.ledger_accounts for all to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council', 'treasurer']))
  with check (public.has_strata_role(strata_id, array['admin', 'council', 'treasurer']));

drop policy if exists "Council can create journal entries" on public.journal_entries;
create policy "Finance roles can create journal entries"
  on public.journal_entries for insert to authenticated
  with check (
    public.has_strata_role(strata_id, array['admin', 'council', 'treasurer'])
    and created_by = (select auth.uid())
  );

drop policy if exists "Council can add journal lines" on public.journal_lines;
create policy "Finance roles can add journal lines"
  on public.journal_lines for insert to authenticated
  with check (public.has_strata_role(strata_id, array['admin', 'council', 'treasurer']));

create or replace function public.create_journal_entry(
  p_strata_id uuid,
  p_entry_date date,
  p_reference text,
  p_description text,
  p_lines jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_entry_id uuid;
  line_count bigint;
  debit_total numeric(14, 2);
  credit_total numeric(14, 2);
begin
  if not public.has_strata_role(
    p_strata_id, array['admin', 'council', 'treasurer']
  ) then
    raise exception 'Finance access is required to post a journal entry';
  end if;
  if jsonb_typeof(p_lines) <> 'array' then
    raise exception 'Journal lines must be a JSON array';
  end if;
  if char_length(trim(p_description)) not between 1 and 500 then
    raise exception 'Description must be between 1 and 500 characters';
  end if;

  select count(*),
    coalesce(sum((line->>'debit')::numeric), 0),
    coalesce(sum((line->>'credit')::numeric), 0)
  into line_count, debit_total, credit_total
  from jsonb_array_elements(p_lines) as lines(line);

  if line_count < 2 or debit_total <= 0 or debit_total <> credit_total then
    raise exception 'Journal entry must contain at least two balanced lines';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_lines) as lines(line)
    left join public.ledger_accounts account
      on account.id = (line->>'account_id')::uuid
      and account.strata_id = p_strata_id
      and account.is_active
    where account.id is null
  ) then
    raise exception 'Every journal line must use an active account in this strata';
  end if;

  insert into public.journal_entries (
    strata_id, entry_date, reference, description, created_by
  )
  values (
    p_strata_id, p_entry_date, nullif(trim(p_reference), ''),
    trim(p_description), auth.uid()
  )
  returning id into new_entry_id;

  insert into public.journal_lines (
    strata_id, journal_entry_id, account_id, debit, credit, memo
  )
  select
    p_strata_id,
    new_entry_id,
    (line->>'account_id')::uuid,
    coalesce(nullif(line->>'debit', '')::numeric, 0),
    coalesce(nullif(line->>'credit', '')::numeric, 0),
    nullif(line->>'memo', '')
  from jsonb_array_elements(p_lines) as lines(line);

  return new_entry_id;
end;
$$;

revoke all on function public.create_journal_entry(uuid, date, text, text, jsonb) from public;
grant execute on function public.create_journal_entry(uuid, date, text, text, jsonb) to authenticated;
