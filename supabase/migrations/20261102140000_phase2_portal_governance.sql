create table public.maintenance_tickets (
  id uuid primary key default gen_random_uuid(),
  strata_id uuid not null references public.strata_corporations(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  title text not null check (char_length(title) between 1 and 160),
  description text not null check (char_length(description) between 1 and 5000),
  status text not null default 'open'
    check (status in ('open', 'in-progress', 'resolved', 'closed')),
  location text not null check (char_length(location) between 1 and 160),
  urgency text not null default 'medium'
    check (urgency in ('low', 'medium', 'high', 'emergency')),
  photo_url text,
  created_at timestamptz not null default now(),
  unique (id, strata_id)
);

create table public.parking_assets (
  id uuid primary key default gen_random_uuid(),
  strata_id uuid not null references public.strata_corporations(id) on delete cascade,
  unit_number text not null check (char_length(unit_number) between 1 and 40),
  stall_number text not null check (char_length(stall_number) between 1 and 80),
  license_plate text check (license_plate is null or char_length(license_plate) <= 24),
  asset_type text not null
    check (asset_type in ('visitor_pass', 'resident_stall', 'locker')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.form_requests (
  id uuid primary key default gen_random_uuid(),
  strata_id uuid not null references public.strata_corporations(id) on delete cascade,
  requested_by text not null check (char_length(requested_by) between 1 and 160),
  unit_number text not null check (char_length(unit_number) between 1 and 40),
  form_type text not null check (form_type in ('Form B', 'Form F')),
  status text not null default 'pending_payment'
    check (status in ('draft', 'pending_payment', 'generated')),
  amount_due numeric(10, 2) not null default 100.00 check (amount_due >= 0),
  created_at timestamptz not null default now()
);

create table public.meeting_minutes (
  id uuid primary key default gen_random_uuid(),
  strata_id uuid not null references public.strata_corporations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  meeting_date date not null,
  meeting_type text not null
    check (meeting_type in ('Council Meeting', 'AGM', 'SGM')),
  raw_notes text not null default '' check (char_length(raw_notes) <= 20000),
  formatted_content text check (
    formatted_content is null or char_length(formatted_content) <= 50000
  ),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index maintenance_tickets_member_timeline_idx
  on public.maintenance_tickets (strata_id, submitted_by, created_at desc);
create index parking_assets_member_assignment_idx
  on public.parking_assets (strata_id, assigned_to, unit_number);
create index form_requests_council_queue_idx
  on public.form_requests (strata_id, created_at desc);
create index meeting_minutes_workspace_timeline_idx
  on public.meeting_minutes (strata_id, meeting_date desc);

alter table public.maintenance_tickets enable row level security;
alter table public.parking_assets enable row level security;
alter table public.form_requests enable row level security;
alter table public.meeting_minutes enable row level security;

create policy "Members read own tickets and council reads all"
  on public.maintenance_tickets for select to authenticated
  using (
    public.is_strata_member(strata_id)
    and (
      submitted_by = (select auth.uid())
      or public.has_strata_role(strata_id, array['admin', 'council'])
    )
  );
create policy "Members submit their own tickets"
  on public.maintenance_tickets for insert to authenticated
  with check (
    public.is_strata_member(strata_id)
    and submitted_by = (select auth.uid())
    and status = 'open'
  );
create policy "Council updates maintenance tickets"
  on public.maintenance_tickets for update to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']))
  with check (public.has_strata_role(strata_id, array['admin', 'council']));
create policy "Council deletes maintenance tickets"
  on public.maintenance_tickets for delete to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']));

create policy "Residents read assigned parking and council reads all"
  on public.parking_assets for select to authenticated
  using (
    public.is_strata_member(strata_id)
    and (
      assigned_to = (select auth.uid())
      or public.has_strata_role(strata_id, array['admin', 'council'])
    )
  );
create policy "Council creates parking assets"
  on public.parking_assets for insert to authenticated
  with check (public.has_strata_role(strata_id, array['admin', 'council']));
create policy "Council updates parking assets"
  on public.parking_assets for update to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']))
  with check (public.has_strata_role(strata_id, array['admin', 'council']));
create policy "Council deletes parking assets"
  on public.parking_assets for delete to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']));

create policy "Council reads form requests"
  on public.form_requests for select to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']));
create policy "Council creates form requests"
  on public.form_requests for insert to authenticated
  with check (public.has_strata_role(strata_id, array['admin', 'council']));
create policy "Council updates form requests"
  on public.form_requests for update to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']))
  with check (public.has_strata_role(strata_id, array['admin', 'council']));
create policy "Council deletes form requests"
  on public.form_requests for delete to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']));

create policy "Members read published minutes and council reads all"
  on public.meeting_minutes for select to authenticated
  using (
    public.is_strata_member(strata_id)
    and (
      status = 'published'
      or public.has_strata_role(strata_id, array['admin', 'council'])
    )
  );
create policy "Council creates meeting minutes"
  on public.meeting_minutes for insert to authenticated
  with check (
    public.has_strata_role(strata_id, array['admin', 'council'])
    and created_by = (select auth.uid())
  );
create policy "Council updates meeting minutes"
  on public.meeting_minutes for update to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']))
  with check (public.has_strata_role(strata_id, array['admin', 'council']));
create policy "Council deletes meeting minutes"
  on public.meeting_minutes for delete to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']));

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'maintenance-photos',
  'maintenance-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy "Members read own maintenance ticket photos and council reads all"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'maintenance-photos'
    and public.is_strata_member(((storage.foldername(name))[1])::uuid)
    and (
      ((storage.foldername(name))[2])::uuid = (select auth.uid())
      or public.has_strata_role(
        ((storage.foldername(name))[1])::uuid,
        array['admin', 'council']
      )
    )
  );
create policy "Members upload their own maintenance ticket photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'maintenance-photos'
    and public.is_strata_member(((storage.foldername(name))[1])::uuid)
    and ((storage.foldername(name))[2])::uuid = (select auth.uid())
  );
create policy "Members remove own maintenance photos and council can remove all"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'maintenance-photos'
    and public.is_strata_member(((storage.foldername(name))[1])::uuid)
    and (
      ((storage.foldername(name))[2])::uuid = (select auth.uid())
      or public.has_strata_role(
        ((storage.foldername(name))[1])::uuid,
        array['admin', 'council']
      )
    )
  );
