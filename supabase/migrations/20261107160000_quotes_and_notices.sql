-- Contractor quotes for maintenance requests, and published council notices for residents.

create table public.maintenance_quotes (
  id uuid primary key default gen_random_uuid(),
  strata_id uuid not null references public.strata_corporations(id) on delete cascade,
  request_id uuid not null references public.maintenance_requests(id) on delete cascade,
  vendor text not null check (char_length(vendor) between 1 and 160),
  amount numeric(14, 2) not null check (amount >= 0),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now()
);

create index maintenance_quotes_request_idx
  on public.maintenance_quotes (strata_id, request_id, amount);

alter table public.maintenance_quotes enable row level security;

create policy "Council can read maintenance quotes"
  on public.maintenance_quotes for select to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']));

create policy "Council can add maintenance quotes"
  on public.maintenance_quotes for insert to authenticated
  with check (
    public.has_strata_role(strata_id, array['admin', 'council'])
    and created_by = (select auth.uid())
    and exists (
      select 1
      from public.maintenance_requests request
      where request.id = request_id
        and request.strata_id = public.maintenance_quotes.strata_id
    )
  );

create table public.strata_notices (
  id uuid primary key default gen_random_uuid(),
  strata_id uuid not null references public.strata_corporations(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 2000),
  severity text not null default 'info'
    check (severity in ('info', 'warning', 'emergency')),
  published boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now()
);

create index strata_notices_published_idx
  on public.strata_notices (strata_id, published, created_at desc);

alter table public.strata_notices enable row level security;

create policy "Members can read published notices"
  on public.strata_notices for select to authenticated
  using (
    public.is_strata_member(strata_id)
    and (
      published
      or public.has_strata_role(strata_id, array['admin', 'council'])
    )
  );

create policy "Council can publish notices"
  on public.strata_notices for insert to authenticated
  with check (
    public.has_strata_role(strata_id, array['admin', 'council'])
    and created_by = (select auth.uid())
  );

revoke all on public.maintenance_quotes from anon;
revoke all on public.strata_notices from anon;
grant select, insert on public.maintenance_quotes to authenticated;
grant select, insert on public.strata_notices to authenticated;
