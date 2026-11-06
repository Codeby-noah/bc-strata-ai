create extension if not exists vector with schema extensions;

create type public.strata_member_role as enum (
  'admin',
  'council',
  'member',
  'auditor'
);

create table public.strata_corporations (
  id uuid primary key default gen_random_uuid(),
  strata_number text not null unique,
  name text not null,
  city text,
  fiscal_year_start_month smallint not null default 1
    check (fiscal_year_start_month between 1 and 12),
  created_at timestamptz not null default now()
);

create table public.strata_memberships (
  strata_id uuid not null references public.strata_corporations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.strata_member_role not null default 'member',
  status text not null default 'active'
    check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  primary key (strata_id, user_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  strata_id uuid not null references public.strata_corporations(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  category text not null
    check (category in (
      'bylaws',
      'minutes',
      'engineering',
      'insurance',
      'financial',
      'exemptions_resolutions',
      'other'
    )),
  file_name text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size between 1 and 20971520),
  storage_path text not null unique,
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  indexed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, strata_id)
);

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  strata_id uuid not null,
  document_id uuid not null,
  chunk_index integer not null check (chunk_index >= 0),
  page_number integer check (page_number is null or page_number > 0),
  content text not null,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index),
  foreign key (document_id, strata_id)
    references public.documents(id, strata_id) on delete cascade
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  strata_id uuid not null references public.strata_corporations(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (
    mime_type in ('application/pdf', 'image/jpeg', 'image/png')
  ),
  byte_size bigint not null check (byte_size between 1 and 20971520),
  status text not null default 'uploaded'
    check (status in ('uploaded', 'review_required', 'approved', 'posted')),
  vendor text,
  invoice_number text,
  invoice_date date,
  due_date date,
  subtotal numeric(14, 2) check (subtotal is null or subtotal >= 0),
  tax numeric(14, 2) check (tax is null or tax >= 0),
  total numeric(14, 2) check (total is null or total >= 0),
  suggested_account_code text,
  suggested_fund text check (
    suggested_fund is null or suggested_fund in ('operating', 'contingency', 'other')
  ),
  extraction jsonb,
  extraction_model text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  strata_id uuid not null references public.strata_corporations(id) on delete cascade,
  account_code text not null,
  account_name text not null,
  account_type text not null
    check (account_type in ('asset', 'liability', 'equity', 'income', 'expense')),
  fund text not null default 'other'
    check (fund in ('operating', 'contingency', 'other')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (strata_id, account_code),
  unique (id, strata_id)
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  strata_id uuid not null references public.strata_corporations(id) on delete cascade,
  entry_date date not null,
  reference text,
  description text not null check (char_length(description) between 1 and 500),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (id, strata_id)
);

create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  strata_id uuid not null,
  journal_entry_id uuid not null,
  account_id uuid not null,
  debit numeric(14, 2) not null default 0 check (debit >= 0),
  credit numeric(14, 2) not null default 0 check (credit >= 0),
  memo text,
  created_at timestamptz not null default now(),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0)),
  foreign key (journal_entry_id, strata_id)
    references public.journal_entries(id, strata_id) on delete restrict,
  foreign key (account_id, strata_id)
    references public.ledger_accounts(id, strata_id) on delete restrict
);

create table public.strata_forms (
  id uuid primary key default gen_random_uuid(),
  strata_id uuid not null references public.strata_corporations(id) on delete cascade,
  form_type text not null check (form_type in ('form_b', 'form_f')),
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'issued', 'void')),
  unit_number text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  strata_id uuid not null references public.strata_corporations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_strata_member(target_strata_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.strata_memberships membership
    where membership.strata_id = target_strata_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  );
$$;

create or replace function public.has_strata_role(
  target_strata_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.strata_memberships membership
    where membership.strata_id = target_strata_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role::text = any (allowed_roles)
  );
$$;

create or replace function public.can_access_strata_storage_object(object_name text)
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
    when array_length(parts, 1) >= 2
      and parts[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and parts[2] = 'documents'
      and array_length(parts, 1) >= 3
      and parts[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.is_strata_member(parts[1]::uuid)
    else false
  end
  from folders;
$$;

create or replace function public.can_read_strata_document_object(object_name text)
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
      and parts[2] = 'documents'
      and parts[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then exists (
      select 1
      from public.documents document
      where document.strata_id = parts[1]::uuid
        and document.id = parts[3]::uuid
        and public.is_strata_member(document.strata_id)
        and (
          document.category <> 'exemptions_resolutions'
          or public.has_strata_role(document.strata_id, array['admin', 'council'])
        )
    )
    else false
  end
  from folders;
$$;

create or replace function public.can_delete_strata_storage_object(object_name text)
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
      and parts[2] = 'documents'
      and parts[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then
      public.has_strata_role(parts[1]::uuid, array['admin', 'council'])
      or exists (
        select 1
        from public.documents document
        where document.strata_id = parts[1]::uuid
          and document.id = parts[3]::uuid
          and document.uploaded_by = (select auth.uid())
      )
    else false
  end
  from folders;
$$;

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
    then public.has_strata_role(parts[1]::uuid, array['admin', 'council'])
    else false
  end
  from folders;
$$;

revoke all on function public.is_strata_member(uuid) from public;
revoke all on function public.has_strata_role(uuid, text[]) from public;
revoke all on function public.can_access_strata_storage_object(text) from public;
revoke all on function public.can_delete_strata_storage_object(text) from public;
revoke all on function public.can_read_strata_document_object(text) from public;
revoke all on function public.can_access_strata_invoice_object(text) from public;
grant execute on function public.is_strata_member(uuid) to authenticated;
grant execute on function public.has_strata_role(uuid, text[]) to authenticated;
grant execute on function public.can_access_strata_storage_object(text) to authenticated;
grant execute on function public.can_delete_strata_storage_object(text) to authenticated;
grant execute on function public.can_read_strata_document_object(text) to authenticated;
grant execute on function public.can_access_strata_invoice_object(text) to authenticated;

alter table public.strata_corporations enable row level security;
alter table public.strata_memberships enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.invoices enable row level security;
alter table public.ledger_accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
alter table public.strata_forms enable row level security;
alter table public.audit_events enable row level security;

create policy "Members can read their strata"
  on public.strata_corporations for select to authenticated
  using (public.is_strata_member(id));

create policy "Members can read their own memberships"
  on public.strata_memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_strata_role(strata_id, array['admin'])
  );

create policy "Admins can add strata members"
  on public.strata_memberships for insert to authenticated
  with check (
    public.has_strata_role(strata_id, array['admin'])
    and role in ('admin', 'council', 'member', 'auditor')
  );

create policy "Admins can update other memberships"
  on public.strata_memberships for update to authenticated
  using (
    user_id <> (select auth.uid())
    and public.has_strata_role(strata_id, array['admin'])
  )
  with check (
    user_id <> (select auth.uid())
    and public.has_strata_role(strata_id, array['admin'])
    and role in ('admin', 'council', 'member', 'auditor')
  );

create policy "Members can read strata documents"
  on public.documents for select to authenticated
  using (
    public.is_strata_member(strata_id)
    and (
      category <> 'exemptions_resolutions'
      or public.has_strata_role(strata_id, array['admin', 'council'])
    )
  );

create policy "Members can add strata documents"
  on public.documents for insert to authenticated
  with check (
    public.is_strata_member(strata_id)
    and uploaded_by = (select auth.uid())
    and (
      category <> 'exemptions_resolutions'
      or public.has_strata_role(strata_id, array['admin', 'council'])
    )
  );

create policy "Council can update strata documents"
  on public.documents for update to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']))
  with check (public.has_strata_role(strata_id, array['admin', 'council']));

create policy "Members can update their own document index timestamp"
  on public.documents for update to authenticated
  using (
    public.is_strata_member(strata_id)
    and uploaded_by = (select auth.uid())
  )
  with check (
    public.is_strata_member(strata_id)
    and uploaded_by = (select auth.uid())
  );

create policy "Council can remove strata document records"
  on public.documents for delete to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']));

create policy "Members can remove their own strata documents"
  on public.documents for delete to authenticated
  using (
    public.is_strata_member(strata_id)
    and uploaded_by = (select auth.uid())
  );

create policy "Members can read document chunks"
  on public.document_chunks for select to authenticated
  using (
    public.is_strata_member(strata_id)
    and exists (
      select 1
      from public.documents document
      where document.id = document_chunks.document_id
        and document.strata_id = document_chunks.strata_id
        and (
          document.category <> 'exemptions_resolutions'
          or public.has_strata_role(strata_id, array['admin', 'council'])
        )
    )
  );

create policy "Members can index their own strata documents"
  on public.document_chunks for insert to authenticated
  with check (
    public.is_strata_member(strata_id)
    and exists (
      select 1
      from public.documents document
      where document.id = document_chunks.document_id
        and document.strata_id = document_chunks.strata_id
        and document.uploaded_by = (select auth.uid())
    )
  );

create policy "Members can replace their own document index"
  on public.document_chunks for delete to authenticated
  using (
    public.is_strata_member(strata_id)
    and exists (
      select 1
      from public.documents document
      where document.id = document_chunks.document_id
        and document.strata_id = document_chunks.strata_id
        and document.uploaded_by = (select auth.uid())
    )
  );

create policy "Council can read invoices"
  on public.invoices for select to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']));

create policy "Council can add invoices"
  on public.invoices for insert to authenticated
  with check (
    public.has_strata_role(strata_id, array['admin', 'council'])
    and created_by = (select auth.uid())
  );

create policy "Council can review invoices"
  on public.invoices for update to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']))
  with check (public.has_strata_role(strata_id, array['admin', 'council']));

create policy "Members can read ledger accounts"
  on public.ledger_accounts for select to authenticated
  using (public.is_strata_member(strata_id));

create policy "Council can manage ledger accounts"
  on public.ledger_accounts for all to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']))
  with check (public.has_strata_role(strata_id, array['admin', 'council']));

create policy "Members can read journal entries"
  on public.journal_entries for select to authenticated
  using (public.is_strata_member(strata_id));

create policy "Council can create journal entries"
  on public.journal_entries for insert to authenticated
  with check (
    public.has_strata_role(strata_id, array['admin', 'council'])
    and created_by = (select auth.uid())
  );

create policy "Members can read journal lines"
  on public.journal_lines for select to authenticated
  using (public.is_strata_member(strata_id));

create policy "Council can add journal lines"
  on public.journal_lines for insert to authenticated
  with check (public.has_strata_role(strata_id, array['admin', 'council']));

create policy "Members can read strata forms"
  on public.strata_forms for select to authenticated
  using (public.is_strata_member(strata_id));

create policy "Council can create strata forms"
  on public.strata_forms for insert to authenticated
  with check (
    public.has_strata_role(strata_id, array['admin', 'council'])
    and created_by = (select auth.uid())
  );

create policy "Council can update strata forms"
  on public.strata_forms for update to authenticated
  using (public.has_strata_role(strata_id, array['admin', 'council']))
  with check (public.has_strata_role(strata_id, array['admin', 'council']));

create policy "Members can read strata audit events"
  on public.audit_events for select to authenticated
  using (public.is_strata_member(strata_id));

create or replace function public.assert_balanced_journal_entry()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_entry_id uuid;
  line_count bigint;
  debit_total numeric(14, 2);
  credit_total numeric(14, 2);
begin
  if tg_table_name = 'journal_entries' then
    target_entry_id := new.id;
  else
    target_entry_id := new.journal_entry_id;
  end if;

  select count(*), coalesce(sum(line.debit), 0), coalesce(sum(line.credit), 0)
    into line_count, debit_total, credit_total
  from public.journal_lines line
  where line.journal_entry_id = target_entry_id;

  if line_count < 2 or debit_total <> credit_total then
    raise exception 'Journal entry % must contain at least two balanced lines', target_entry_id;
  end if;
  return null;
end;
$$;

create constraint trigger journal_entries_must_balance
  after insert on public.journal_entries
  deferrable initially deferred
  for each row execute function public.assert_balanced_journal_entry();

create constraint trigger journal_lines_must_balance
  after insert on public.journal_lines
  deferrable initially deferred
  for each row execute function public.assert_balanced_journal_entry();

create or replace function public.reject_journal_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Journal records are immutable; create a correcting entry instead';
end;
$$;

create trigger journal_entries_immutable
  before update or delete on public.journal_entries
  for each row execute function public.reject_journal_mutation();

create trigger journal_lines_immutable
  before update or delete on public.journal_lines
  for each row execute function public.reject_journal_mutation();

create view public.ledger_account_balances
with (security_invoker = true)
as
select
  account.strata_id,
  account.id as account_id,
  account.account_code,
  account.account_name,
  account.account_type,
  account.fund,
  account.is_active,
  coalesce(
    sum(
      case
        when account.account_type in ('asset', 'expense')
          then line.debit - line.credit
        else line.credit - line.debit
      end
    ),
    0
  ) as current_balance
from public.ledger_accounts account
left join public.journal_lines line
  on line.account_id = account.id
  and line.strata_id = account.strata_id
group by
  account.strata_id,
  account.id,
  account.account_code,
  account.account_name,
  account.account_type,
  account.fund,
  account.is_active;

create index document_chunks_embedding_hnsw_idx
  on public.document_chunks
  using hnsw (embedding extensions.vector_cosine_ops)
  where embedding is not null;

create or replace function public.match_document_chunks(
  query_embedding extensions.vector(1536),
  target_strata_id uuid,
  minimum_similarity real default 0.15,
  result_limit integer default 6
)
returns table (
  chunk_id uuid,
  document_id uuid,
  title text,
  category text,
  page_number integer,
  content text,
  similarity real
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    chunk.id,
    document.id,
    document.title,
    document.category,
    chunk.page_number,
    chunk.content,
    (1 - (chunk.embedding operator(extensions.<=>) query_embedding))::real
  from public.document_chunks chunk
  join public.documents document
    on document.id = chunk.document_id
    and document.strata_id = chunk.strata_id
  where chunk.strata_id = target_strata_id
    and chunk.embedding is not null
    and public.is_strata_member(target_strata_id)
    and (1 - (chunk.embedding operator(extensions.<=>) query_embedding))
      >= greatest(0, least(minimum_similarity, 1))
  order by chunk.embedding operator(extensions.<=>) query_embedding
  limit greatest(1, least(result_limit, 12));
$$;

revoke all on function public.match_document_chunks(
  extensions.vector,
  uuid,
  real,
  integer
) from public;
grant execute on function public.match_document_chunks(
  extensions.vector,
  uuid,
  real,
  integer
) to authenticated;

grant select, insert, update, delete on
  public.strata_corporations,
  public.strata_memberships,
  public.document_chunks,
  public.invoices,
  public.ledger_accounts,
  public.journal_entries,
  public.journal_lines,
  public.strata_forms,
  public.audit_events
to authenticated;
grant select, insert, delete on public.documents to authenticated;
grant update (indexed_at) on public.documents to authenticated;
grant select on public.ledger_account_balances to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'strata-documents',
  'strata-documents',
  false,
  20971520,
  array['application/pdf', 'image/jpeg', 'image/png', 'text/csv', 'text/plain']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Strata members can read private documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'strata-documents'
    and public.can_read_strata_document_object(name)
  );

create policy "Strata members can upload private documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'strata-documents'
    and public.can_access_strata_storage_object(name)
  );

create policy "Strata members can clean up their private uploads"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'strata-documents'
    and public.can_delete_strata_storage_object(name)
    or (
      bucket_id = 'strata-documents'
      and owner_id = (select auth.uid())::text
    )
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'strata-invoices',
  'strata-invoices',
  false,
  20971520,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Council can read private invoice files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'strata-invoices'
    and public.can_access_strata_invoice_object(name)
  );

create policy "Council can upload private invoice files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'strata-invoices'
    and public.can_access_strata_invoice_object(name)
  );

create policy "Council can delete private invoice files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'strata-invoices'
    and public.can_access_strata_invoice_object(name)
  );
