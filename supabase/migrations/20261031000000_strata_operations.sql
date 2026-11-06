create extension if not exists btree_gist with schema extensions;

create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  strata_id uuid not null references public.strata_corporations(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text not null check (char_length(description) between 1 and 5000),
  location text not null check (char_length(location) between 1 and 160),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'emergency')),
  status text not null default 'submitted'
    check (status in ('submitted', 'triaged', 'in_progress', 'completed', 'closed')),
  reported_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.amenity_spaces (
  id uuid primary key default gen_random_uuid(),
  strata_id uuid not null references public.strata_corporations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  unique (id, strata_id)
);

create table public.amenity_reservations (
  id uuid primary key default gen_random_uuid(),
  strata_id uuid not null references public.strata_corporations(id) on delete cascade,
  space_id uuid not null,
  requested_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  purpose text not null check (char_length(purpose) between 1 and 500),
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'declined', 'cancelled')),
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  foreign key (space_id, strata_id)
    references public.amenity_spaces(id, strata_id) on delete restrict
);

create table public.visitor_parking_passes (
  id uuid primary key default gen_random_uuid(),
  strata_id uuid not null references public.strata_corporations(id) on delete cascade,
  issued_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  visitor_name text not null check (char_length(visitor_name) between 1 and 120),
  vehicle_plate text not null check (char_length(vehicle_plate) between 1 and 24),
  stall text not null check (char_length(stall) between 1 and 80),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.governance_proposals (
  id uuid primary key default gen_random_uuid(),
  strata_id uuid not null references public.strata_corporations(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 5000),
  options text[] not null default array['For', 'Against', 'Abstain'],
  opens_at timestamptz not null default now(),
  closes_at timestamptz not null,
  status text not null default 'open'
    check (status in ('open', 'closed', 'cancelled')),
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  check (closes_at > opens_at),
  check (cardinality(options) between 2 and 8),
  unique (id, strata_id)
);

create table public.governance_votes (
  id uuid primary key default gen_random_uuid(),
  strata_id uuid not null references public.strata_corporations(id) on delete cascade,
  proposal_id uuid not null,
  user_id uuid not null references auth.users(id) on delete restrict default auth.uid(),
  choice text not null check (char_length(choice) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (proposal_id, user_id),
  foreign key (proposal_id, strata_id)
    references public.governance_proposals(id, strata_id) on delete restrict
);

create table public.strata_compliance_items (
  id uuid primary key default gen_random_uuid(),
  strata_id uuid not null references public.strata_corporations(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  category text not null
    check (category in ('compliance', 'insurance', 'warranty', 'maintenance', 'other')),
  due_date date not null,
  notes text not null default '' check (char_length(notes) <= 2000),
  status text not null default 'upcoming'
    check (status in ('upcoming', 'completed', 'dismissed')),
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index maintenance_requests_strata_created_idx
  on public.maintenance_requests (strata_id, created_at desc);
create index amenity_reservations_space_time_idx
  on public.amenity_reservations (space_id, starts_at, ends_at);
alter table public.amenity_reservations
  add constraint amenity_reservations_no_overlap
  exclude using gist (
    space_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status in ('requested', 'approved'));
create index visitor_parking_passes_strata_time_idx
  on public.visitor_parking_passes (strata_id, starts_at, ends_at);
create index governance_proposals_strata_created_idx
  on public.governance_proposals (strata_id, created_at desc);
create index strata_compliance_items_strata_due_idx
  on public.strata_compliance_items (strata_id, due_date);

alter table public.maintenance_requests enable row level security;
alter table public.amenity_spaces enable row level security;
alter table public.amenity_reservations enable row level security;
alter table public.visitor_parking_passes enable row level security;
alter table public.governance_proposals enable row level security;
alter table public.governance_votes enable row level security;
alter table public.strata_compliance_items enable row level security;

create policy "Members can read maintenance requests"
  on public.maintenance_requests for select to authenticated
  using (
    (
      reported_by = (select auth.uid())
      and public.is_strata_member(strata_id)
    )
    or public.has_strata_role(strata_id, array['admin', 'council'])
  );
create policy "Members can report maintenance requests"
  on public.maintenance_requests for insert to authenticated
  with check (
    public.is_strata_member(strata_id)
    and reported_by = (select auth.uid())
  );
create policy "Council can manage maintenance requests"
  on public.maintenance_requests for update to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']))
  with check (public.has_strata_role(strata_id, array['admin', 'council']));

create policy "Members can read active amenity spaces"
  on public.amenity_spaces for select to authenticated
  using (public.is_strata_member(strata_id) and is_active);
create policy "Council can add amenity spaces"
  on public.amenity_spaces for insert to authenticated
  with check (
    public.has_strata_role(strata_id, array['admin', 'council'])
    and created_by = (select auth.uid())
  );
create policy "Council can update amenity spaces"
  on public.amenity_spaces for update to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']))
  with check (public.has_strata_role(strata_id, array['admin', 'council']));
create policy "Council can delete amenity spaces"
  on public.amenity_spaces for delete to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']));

create policy "Members can read their amenity reservations and council can review all"
  on public.amenity_reservations for select to authenticated
  using (
    (
      requested_by = (select auth.uid())
      and public.is_strata_member(strata_id)
    )
    or public.has_strata_role(strata_id, array['admin', 'council'])
  );
create policy "Members can request amenity reservations"
  on public.amenity_reservations for insert to authenticated
  with check (
    public.is_strata_member(strata_id)
    and requested_by = (select auth.uid())
    and status = 'requested'
    and exists (
      select 1
      from public.amenity_spaces space
      where space.id = space_id
        and space.strata_id = public.amenity_reservations.strata_id
        and space.is_active
    )
  );
create policy "Council can review amenity reservations"
  on public.amenity_reservations for update to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']))
  with check (
    public.has_strata_role(strata_id, array['admin', 'council'])
    and reviewed_by = (select auth.uid())
  );
create policy "Members can cancel their own amenity requests"
  on public.amenity_reservations for update to authenticated
  using (
    requested_by = (select auth.uid())
    and status = 'requested'
    and public.is_strata_member(strata_id)
  )
  with check (
    requested_by = (select auth.uid())
    and status = 'cancelled'
    and public.is_strata_member(strata_id)
  );

create policy "Members can read their parking passes"
  on public.visitor_parking_passes for select to authenticated
  using (
    (
      issued_by = (select auth.uid())
      and public.is_strata_member(strata_id)
    )
    or public.has_strata_role(strata_id, array['admin', 'council'])
  );
create policy "Members can issue their own parking passes"
  on public.visitor_parking_passes for insert to authenticated
  with check (
    public.is_strata_member(strata_id)
    and issued_by = (select auth.uid())
  );

create policy "Members can read governance proposals"
  on public.governance_proposals for select to authenticated
  using (public.is_strata_member(strata_id));
create policy "Council can create governance proposals"
  on public.governance_proposals for insert to authenticated
  with check (
    public.has_strata_role(strata_id, array['admin', 'council'])
    and created_by = (select auth.uid())
  );
create policy "Council can update governance proposals"
  on public.governance_proposals for update to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']))
  with check (public.has_strata_role(strata_id, array['admin', 'council']));

create policy "Members can read their votes and council can review all"
  on public.governance_votes for select to authenticated
  using (
    (
      user_id = (select auth.uid())
      and public.is_strata_member(strata_id)
    )
    or public.has_strata_role(strata_id, array['admin', 'council'])
  );
create policy "Eligible council members can vote once"
  on public.governance_votes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.has_strata_role(strata_id, array['admin', 'council'])
    and exists (
      select 1
      from public.governance_proposals proposal
      where proposal.id = proposal_id
        and proposal.strata_id = public.governance_votes.strata_id
        and proposal.status = 'open'
        and proposal.opens_at <= now()
        and proposal.closes_at > now()
        and choice = any (proposal.options)
    )
  );

create policy "Members can read compliance items"
  on public.strata_compliance_items for select to authenticated
  using (public.is_strata_member(strata_id));
create policy "Council can add compliance items"
  on public.strata_compliance_items for insert to authenticated
  with check (
    public.has_strata_role(strata_id, array['admin', 'council'])
    and created_by = (select auth.uid())
  );
create policy "Council can update compliance items"
  on public.strata_compliance_items for update to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']))
  with check (public.has_strata_role(strata_id, array['admin', 'council']));
create policy "Council can delete compliance items"
  on public.strata_compliance_items for delete to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']));

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
  if not public.has_strata_role(p_strata_id, array['admin', 'council']) then
    raise exception 'Council access is required to post a journal entry';
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
