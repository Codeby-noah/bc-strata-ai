import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL(
  "../supabase/migrations/20261030000000_strata_mvp.sql",
  import.meta.url,
);
const migration = await readFile(migrationPath, "utf8");
const operationsMigration = await readFile(
  new URL(
    "../supabase/migrations/20261031000000_strata_operations.sql",
    import.meta.url,
  ),
  "utf8",
);
const onboardingMigration = await readFile(
  new URL(
    "../supabase/migrations/20261031170000_strata_onboarding_treasurer.sql",
    import.meta.url,
  ),
  "utf8",
);
const treasurerRoleMigration = await readFile(
  new URL(
    "../supabase/migrations/20261031160000_add_treasurer_role.sql",
    import.meta.url,
  ),
  "utf8",
);
const sectionCitationsMigration = await readFile(
  new URL(
    "../supabase/migrations/20261101000000_document_section_citations.sql",
    import.meta.url,
  ),
  "utf8",
);
const phaseTwoMigration = await readFile(
  new URL(
    "../supabase/migrations/20261102140000_phase2_portal_governance.sql",
    import.meta.url,
  ),
  "utf8",
);
const billingMigration = await readFile(
  new URL(
    "../supabase/migrations/20261102150000_strata_billing.sql",
    import.meta.url,
  ),
  "utf8",
);
const maintenancePhotoMigration = await readFile(
  new URL(
    "../supabase/migrations/20261102180000_allow_gif_maintenance_photos.sql",
    import.meta.url,
  ),
  "utf8",
);

const tenantTables = [
  "strata_corporations",
  "strata_memberships",
  "documents",
  "document_chunks",
  "invoices",
  "ledger_accounts",
  "journal_entries",
  "journal_lines",
  "strata_forms",
  "audit_events",
];

test("enables row-level security on every tenant data table", () => {
  for (const table of tenantTables) {
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} enable row level security;`, "i"),
      `${table} must have row-level security enabled`,
    );
  }
});

test("uses active memberships for tenant authorization", () => {
  assert.match(migration, /membership\.user_id = \(select auth\.uid\(\)\)/i);
  assert.match(migration, /membership\.status = 'active'/i);
  assert.match(migration, /public\.is_strata_member\(strata_id\)/i);
  assert.match(migration, /public\.has_strata_role\(strata_id, array\['admin', 'council'\]\)/i);
});

test("keeps the document bucket private and tenant-scoped", () => {
  assert.match(migration, /'strata-documents',\s*'strata-documents',\s*false,/i);
  assert.match(migration, /public\.can_access_strata_storage_object\(name\)/i);
  assert.match(migration, /20971520/);
  assert.match(migration, /can_delete_strata_storage_object/);
});

test("protects financial history with immutable balanced journal entries", () => {
  assert.match(migration, /journal_entries_immutable/i);
  assert.match(migration, /journal_lines_immutable/i);
  assert.match(migration, /deferrable initially deferred/i);
  assert.match(migration, /debit_total <> credit_total/i);
  assert.match(migration, /line_count < 2/i);
});

test("supports cited document retrieval and council-only invoice review", () => {
  assert.match(migration, /match_document_chunks/i);
  assert.match(migration, /page_number integer/i);
  assert.match(migration, /indexed_at timestamptz/i);
  assert.match(migration, /exemptions_resolutions/i);
  assert.match(migration, /category <> 'exemptions_resolutions'/i);
  assert.match(migration, /can_read_strata_document_object/i);
  assert.match(migration, /Members can remove their own strata documents/i);
  assert.match(migration, /Council can add invoices/i);
  assert.match(migration, /Council can review invoices/i);
  assert.match(migration, /strata-invoices/);
  assert.match(migration, /can_access_strata_invoice_object/i);
});

test("does not include destructive schema or data removal", () => {
  assert.doesNotMatch(migration, /\bdrop\s+(table|schema|extension|type)\b/i);
  assert.doesNotMatch(migration, /\btruncate\b/i);
  assert.doesNotMatch(operationsMigration, /\bdrop\s+(table|schema|extension|type)\b/i);
  assert.doesNotMatch(operationsMigration, /\btruncate\b/i);
  assert.doesNotMatch(onboardingMigration, /\bdrop\s+(table|schema|extension|type)\b/i);
  assert.doesNotMatch(onboardingMigration, /\btruncate\b/i);
  assert.doesNotMatch(treasurerRoleMigration, /\bdrop\s+(table|schema|extension|type)\b/i);
  assert.doesNotMatch(treasurerRoleMigration, /\btruncate\b/i);
  assert.doesNotMatch(sectionCitationsMigration, /\bdrop\s+(table|schema|extension|type)\b/i);
  assert.doesNotMatch(sectionCitationsMigration, /\btruncate\b/i);
});

test("protects new operations features with tenant RLS and role-aware policies", () => {
  for (const table of [
    "maintenance_requests",
    "amenity_spaces",
    "amenity_reservations",
    "visitor_parking_passes",
    "governance_proposals",
    "governance_votes",
    "strata_compliance_items",
  ]) {
    assert.match(
      operationsMigration,
      new RegExp(`alter table public\\.${table} enable row level security;`, "i"),
      `${table} must have row-level security enabled`,
    );
  }
  assert.match(operationsMigration, /Eligible council members can vote once/i);
  assert.match(operationsMigration, /unique \(proposal_id, user_id\)/i);
  assert.match(operationsMigration, /amenity_reservations_no_overlap/i);
  assert.match(operationsMigration, /Members can issue their own parking passes/i);
  assert.match(operationsMigration, /Council can add compliance items/i);
  assert.match(operationsMigration, /create or replace function public\.create_journal_entry/i);
  assert.match(operationsMigration, /security invoker/i);
  assert.match(operationsMigration, /grant execute on function public\.create_journal_entry/i);
});

test("adds self-service workspace creation with a first administrator", () => {
  assert.match(treasurerRoleMigration, /add value if not exists 'treasurer'/i);
  assert.match(onboardingMigration, /create or replace function public\.create_strata_workspace/i);
  assert.match(onboardingMigration, /security definer\s+set search_path = ''/i);
  assert.match(onboardingMigration, /insert into public\.strata_memberships/i);
  assert.match(onboardingMigration, /values \(new_strata_id, creator_id, 'admin', 'active'\)/i);
  assert.match(onboardingMigration, /revoke all on function public\.create_strata_workspace/i);
});

test("limits member management to administrators and separates finance permissions", () => {
  assert.match(onboardingMigration, /public\.has_strata_role\(target_strata_id, array\['admin'\]\)/i);
  assert.match(onboardingMigration, /create or replace function public\.add_strata_member_by_email/i);
  assert.match(onboardingMigration, /create or replace function public\.list_strata_members/i);
  assert.match(
    onboardingMigration,
    /array\['admin', 'council', 'treasurer', 'auditor'\]/i,
  );
  assert.match(
    onboardingMigration,
    /array\['admin', 'council', 'treasurer'\]/i,
  );
  assert.match(
    onboardingMigration,
    /public\.has_strata_role\(\s*p_strata_id, array\['admin', 'council', 'treasurer'\]\s*\)/i,
  );
});

test("stores source section metadata and returns it with cited search results", () => {
  assert.match(sectionCitationsMigration, /add column if not exists section text/i);
  assert.match(sectionCitationsMigration, /section text,/i);
  assert.match(sectionCitationsMigration, /chunk\.section/i);
});

test("adds tenant-scoped Phase 2 tables and private ticket photo storage", () => {
  for (const table of [
    "maintenance_tickets",
    "parking_assets",
    "form_requests",
    "meeting_minutes",
  ]) {
    assert.match(
      phaseTwoMigration,
      new RegExp(`alter table public\\.${table} enable row level security;`, "i"),
      `${table} must have row-level security enabled`,
    );
    assert.match(
      phaseTwoMigration,
      new RegExp(`create policy[\\s\\S]*?on public\\.${table} for select`, "i"),
      `${table} must define a SELECT policy`,
    );
  }
  assert.match(phaseTwoMigration, /public\.is_strata_member\(strata_id\)/i);
  assert.match(phaseTwoMigration, /public\.has_strata_role\(strata_id, array\['admin', 'council'\]\)/i);
  assert.match(phaseTwoMigration, /'maintenance-photos',\s*'maintenance-photos',\s*false/i);
  assert.match(phaseTwoMigration, /members upload their own maintenance ticket photos/i);
  assert.match(phaseTwoMigration, /create policy[\s\S]*?on public\.meeting_minutes for update/i);
  assert.doesNotMatch(phaseTwoMigration, /\bdrop\s+(table|schema|extension|type)\b/i);
  assert.doesNotMatch(phaseTwoMigration, /\btruncate\b/i);
});

test("extends the private maintenance photo bucket to accept GIF photos", () => {
  assert.match(maintenancePhotoMigration, /update storage\.buckets/i);
  assert.match(maintenancePhotoMigration, /where id = 'maintenance-photos'/i);
  assert.match(maintenancePhotoMigration, /'image\/gif'/i);
  assert.doesNotMatch(maintenancePhotoMigration, /'image\/svg\+xml'/i);
  assert.match(phaseTwoMigration, /'maintenance-photos',\s*'maintenance-photos',\s*false/i);
});

test("keeps Stripe billing records private to strata administrators", () => {
  assert.match(billingMigration, /create table public\.strata_billing/i);
  assert.match(billingMigration, /strata_id uuid primary key/i);
  assert.match(billingMigration, /stripe_customer_id text unique/i);
  assert.match(billingMigration, /stripe_subscription_id text unique/i);
  assert.match(billingMigration, /alter table public\.strata_billing enable row level security/i);
  assert.match(billingMigration, /has_strata_role\(strata_id, array\['admin'\]\)/i);
  assert.match(billingMigration, /revoke all on public\.strata_billing from anon, authenticated/i);
  assert.match(billingMigration, /grant all on public\.strata_billing to service_role/i);
});
