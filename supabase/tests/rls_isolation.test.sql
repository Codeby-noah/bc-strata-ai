begin;

select plan(15);

insert into auth.users (
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
  is_sso_user,
  is_anonymous
)
values
  (
    '00000000-0000-4000-8000-0000000000a1',
    'authenticated',
    'authenticated',
    'rls-user-a@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-4000-8000-0000000000b1',
    'authenticated',
    'authenticated',
    'rls-user-b@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    false,
    false
  );

insert into public.strata_corporations (id, strata_number, name, city)
values
  (
    '00000000-0000-4000-8000-0000000000a2',
    'RLS-TEST-A',
    'Strata A (RLS Test)',
    'Victoria'
  ),
  (
    '00000000-0000-4000-8000-0000000000b2',
    'RLS-TEST-B',
    'Strata B (RLS Test)',
    'Nanaimo'
  );

insert into public.strata_memberships (strata_id, user_id, role, status)
values
  (
    '00000000-0000-4000-8000-0000000000a2',
    '00000000-0000-4000-8000-0000000000a1',
    'admin',
    'active'
  ),
  (
    '00000000-0000-4000-8000-0000000000b2',
    '00000000-0000-4000-8000-0000000000b1',
    'member',
    'active'
  );

insert into public.documents (
  id,
  strata_id,
  title,
  category,
  file_name,
  mime_type,
  byte_size,
  storage_path,
  uploaded_by
)
values
  (
    '00000000-0000-4000-8000-0000000000a3',
    '00000000-0000-4000-8000-0000000000a2',
    'Private Strata A Test Document',
    'bylaws',
    'strata-a-test.pdf',
    'application/pdf',
    100,
    '00000000-0000-4000-8000-0000000000a2/documents/00000000-0000-4000-8000-0000000000a3/strata-a-test.pdf',
    '00000000-0000-4000-8000-0000000000a1'
  ),
  (
    '00000000-0000-4000-8000-0000000000b3',
    '00000000-0000-4000-8000-0000000000b2',
    'Private Strata B Test Document',
    'bylaws',
    'strata-b-test.pdf',
    'application/pdf',
    100,
    '00000000-0000-4000-8000-0000000000b2/documents/00000000-0000-4000-8000-0000000000b3/strata-b-test.pdf',
    '00000000-0000-4000-8000-0000000000b1'
  );

insert into public.ledger_accounts (
  id,
  strata_id,
  account_code,
  account_name,
  account_type,
  fund
)
values
  (
    '00000000-0000-4000-8000-0000000000a4',
    '00000000-0000-4000-8000-0000000000a2',
    'RLS-A-100',
    'Strata A Private Test Account',
    'asset',
    'operating'
  ),
  (
    '00000000-0000-4000-8000-0000000000b4',
    '00000000-0000-4000-8000-0000000000b2',
    'RLS-B-100',
    'Strata B Test Account',
    'asset',
    'operating'
  );

insert into storage.objects (bucket_id, name, owner_id)
values
  (
    'strata-documents',
    '00000000-0000-4000-8000-0000000000a2/documents/00000000-0000-4000-8000-0000000000a3/strata-a-test.pdf',
    '00000000-0000-4000-8000-0000000000a1'
  ),
  (
    'strata-documents',
    '00000000-0000-4000-8000-0000000000b2/documents/00000000-0000-4000-8000-0000000000b3/strata-b-test.pdf',
    '00000000-0000-4000-8000-0000000000b1'
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-0000000000b1',
  true
);

select is(
  (select count(*) from public.strata_corporations
    where id = '00000000-0000-4000-8000-0000000000b2'),
  1::bigint,
  'Strata B user can read their own strata'
);
select is(
  (select count(*) from public.strata_corporations
    where id = '00000000-0000-4000-8000-0000000000a2'),
  0::bigint,
  'Strata B user cannot read Strata A'
);
select is(
  (select count(*) from public.strata_memberships
    where strata_id = '00000000-0000-4000-8000-0000000000b2'),
  1::bigint,
  'Strata B user can read their own membership'
);
select is(
  (select count(*) from public.strata_memberships
    where strata_id = '00000000-0000-4000-8000-0000000000a2'),
  0::bigint,
  'Strata B user cannot read Strata A memberships'
);
select is(
  (select count(*) from public.documents
    where id = '00000000-0000-4000-8000-0000000000b3'),
  1::bigint,
  'Strata B user can read their own document'
);
select is(
  (select count(*) from public.documents
    where id = '00000000-0000-4000-8000-0000000000a3'),
  0::bigint,
  'Fetching Strata A document by its exact ID returns no rows to Strata B'
);
select is(
  (select count(*) from public.ledger_accounts
    where id = '00000000-0000-4000-8000-0000000000a4'),
  0::bigint,
  'Strata B user cannot read Strata A ledger accounts'
);
select is(
  (select count(*) from storage.objects
    where bucket_id = 'strata-documents'
      and name = '00000000-0000-4000-8000-0000000000b2/documents/00000000-0000-4000-8000-0000000000b3/strata-b-test.pdf'),
  1::bigint,
  'Strata B user can read their own private storage object'
);
select is(
  (select count(*) from storage.objects
    where bucket_id = 'strata-documents'
      and name = '00000000-0000-4000-8000-0000000000a2/documents/00000000-0000-4000-8000-0000000000a3/strata-a-test.pdf'),
  0::bigint,
  'Strata B user cannot read Strata A private storage object'
);
select throws_ok(
  $$
    insert into public.documents (
      strata_id, title, category, file_name, mime_type, byte_size,
      storage_path, uploaded_by
    )
    values (
      '00000000-0000-4000-8000-0000000000a2',
      'Unauthorized cross-strata insert',
      'bylaws',
      'blocked.pdf',
      'application/pdf',
      100,
      '00000000-0000-4000-8000-0000000000a2/documents/00000000-0000-4000-8000-0000000000a5/blocked.pdf',
      '00000000-0000-4000-8000-0000000000b1'
    )
  $$,
  '42501',
  null,
  'Strata B user cannot insert a document into Strata A'
);
select throws_ok(
  $$
    insert into public.ledger_accounts (
      strata_id, account_code, account_name, account_type, fund
    )
    values (
      '00000000-0000-4000-8000-0000000000a2',
      'RLS-BLOCKED-100',
      'Unauthorized cross-strata account',
      'asset',
      'operating'
    )
  $$,
  '42501',
  null,
  'Strata B user cannot create a ledger account in Strata A'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-0000000000a1',
  true
);

select is(
  (select count(*) from public.documents
    where id = '00000000-0000-4000-8000-0000000000a3'),
  1::bigint,
  'Strata A user can read their own document'
);
select is(
  (select count(*) from public.ledger_accounts
    where id = '00000000-0000-4000-8000-0000000000a4'),
  1::bigint,
  'Strata A user can read their own ledger account'
);
select is(
  (select count(*) from public.documents
    where id = '00000000-0000-4000-8000-0000000000b3'),
  0::bigint,
  'Strata A user cannot read Strata B documents'
);
select is(
  (select count(*) from storage.objects
    where bucket_id = 'strata-documents'
      and name = '00000000-0000-4000-8000-0000000000b2/documents/00000000-0000-4000-8000-0000000000b3/strata-b-test.pdf'),
  0::bigint,
  'Strata A user cannot read Strata B private storage object'
);

select * from finish();
rollback;
