# StrataDock

Private operations workspace for self-managed townhouse strata councils in British Columbia.

## Local development

The root `.env.local` must contain the public Supabase project settings:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Never put a Supabase service-role key in a browser-visible variable or commit any `.env` file.
For AI features, optionally configure `OPENAI_API_KEY` as a server-only environment variable (never `NEXT_PUBLIC_*`). Document text is sent to OpenAI only after a user checks the indexing consent box; invoice files are sent only when an authorized council member chooses **Analyze**.

```bash
npm install
npm run dev
```

Run local checks with `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`. The tests check migration security invariants; behavioral RLS isolation tests require an authorized test database and are not run against the connected project.

### Local RLS isolation test

`supabase/tests/rls_isolation.test.sql` creates two temporary test users, strata, documents, and ledger accounts inside a transaction, impersonates each user with the `authenticated` database role, and checks that cross-strata reads and writes are blocked. The test rolls back all fixtures. It uses only the local Supabase database; do not pass `--linked` or a hosted `--db-url`.

With Docker available, run these commands from the repository root:

```bash
npx supabase start
npx supabase migration up --local
npx supabase test db --local
```

`migration up --local` applies pending migrations to the local database only. Do not use `supabase db reset` if you need to preserve existing local data; resetting is unnecessary for this test.

## Supabase setup

The app uses Supabase Auth with cookie-backed server sessions. Private routes verify the user on the server, and each user must have an active `strata_memberships` row before strata data is shown. Tenant-scoped RLS is the data boundary; the active strata selector is not an authorization boundary.

Users can create an account from `/signup`. Supabase email confirmation must be enabled/configured for your project if you want verification emails. Add the app origin and `/auth/callback` to the Supabase Auth redirect URL allowlist (for local development, `http://localhost:3000/auth/callback`). After signing in, a user can create a strata workspace and becomes its first administrator. An administrator can add existing registered users as administrators, council, treasurers, residents, or auditors. The app does not send invitation emails; people must sign up first.

The migrations in `supabase/migrations/` prepare tenant tables, private storage buckets, RLS policies, vector-ready document chunks, immutable balanced journal entries, workspace onboarding, role-specific financial access, and section citations. Before any hosted schema change, verify the linked project and pending migration list, then obtain the project owner's explicit authorization.

When authorized, link the Supabase CLI to the confirmed project and apply pending migrations with:

```bash
npx supabase db push --linked
```

No test accounts, strata, memberships, financial entries, or storage objects are created by the repository or by its tests.

## Stripe subscription billing

The billing page is `/billing`; only a strata administrator can start Checkout. The server creates a Stripe Checkout subscription at **$179 CAD per month**, with a **$40 discount for the first 12 months** after the free trial so those months are **$139 CAD**, and tags the Checkout Session and subscription with the active `strata_id`. A verified webhook stores the customer, subscription, and status in `public.strata_billing`. This is separate from the strata record, is readable only by that strata's administrator, and is written by the server-side service role. Stripe status currently records billing state; it does not yet gate access to application features. Payment processing, billing migration application, cancellation management, and tax advice are outside this implementation.

Add these values to the ignored local `.env.local` file; never use `NEXT_PUBLIC_` prefixes for secrets:

```text
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_SITE_URL` must exactly match the browser origin used for the app (for example `http://127.0.0.1:3000` if using that host). The Supabase service-role key is available in the Supabase project's API settings; it bypasses RLS, so keep it server-only and do not send or commit it. The Checkout route uses the normal authenticated Supabase session for reads; the webhook needs service-role access because Stripe has no user session.

### Configure Stripe test mode

1. Sign in at the Stripe Dashboard and switch **Test mode** on.
2. Open **Developers → API keys**. Reveal and copy the **Secret key** beginning with `sk_test_` into `.env.local` as `STRIPE_SECRET_KEY`. The app creates its monthly price inline, so you do not need to create a Stripe Price first. A publishable key is not used by this server-created Checkout flow.
3. For local webhook testing, install and authenticate the Stripe CLI, then run this in a separate terminal while the Next.js app is running:

   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

   Copy the `whsec_...` signing secret printed by `stripe listen` into `.env.local` as `STRIPE_WEBHOOK_SECRET`. Do not use this local forwarding secret as a production endpoint secret.
4. Restart the Next.js development server after setting environment variables. Visit `/billing` while signed in as the active strata administrator and use a Stripe test card from Stripe's test-card documentation; no live payment will be taken with a test secret.

### Configure a deployed test webhook

1. In the Stripe Dashboard with **Test mode** enabled, open **Developers → Webhooks** (or **Workbench → Webhooks**, depending on the Dashboard view) and choose **Add destination / Add endpoint**.
2. Set the endpoint URL to `https://YOUR-APP-DOMAIN/api/stripe/webhook`.
3. Subscribe it to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.
4. Save the endpoint, reveal its signing secret, and set that endpoint-specific `whsec_...` value as `STRIPE_WEBHOOK_SECRET` in the app host's server-side environment. Set `STRIPE_SECRET_KEY` to the Test-mode key and set `SUPABASE_SERVICE_ROLE_KEY` in the same server-only environment.
5. Apply `20261102150000_strata_billing.sql` to the intended Supabase environment only after reviewing the target and explicitly authorizing that schema change. Then deploy/restart the app and start Checkout from `/billing` as a strata administrator using a Stripe test card to verify an end-to-end webhook with valid strata metadata.

## MVP scope

- Sign-in and sign-out through Supabase Auth.
- Membership-gated dashboard, document vault, balances, and Form B/F record listing.
- Self-service strata workspace creation with the creator assigned as its first administrator; administrator-controlled member role assignment.
- Private per-strata file uploads and short-lived signed downloads.
- Cited semantic search over indexed text documents, selectable-text PDFs, scanned PDFs up to 15 pages, and JPG/PNG pages, including page and detected section citations and a dedicated Exemptions & Resolutions category. Scanned documents are sent to OpenAI for OCR only after explicit user consent.
- Finance-role invoice queue with explicit opt-in OpenAI Vision extraction and suggested account codes; extraction remains a draft for human review and is never posted automatically.
- Configurable chart of accounts split across operating and contingency reserve funds, with auditor read-only access.
- Database foundation for document embeddings, double-entry finance, and tenant-isolated forms.
- OCR for scanned documents over 15 pages, automatic invoice-to-ledger posting, and official Form B/F generation/certification remain future work. The app can create Form B/F draft tracking records and manually post balanced journal entries; financial history is immutable.

## Phase 2 resident and governance workflows

The additive `20261102140000_phase2_portal_governance.sql` migration prepares tenant-scoped maintenance tickets, assigned parking assets, Form B/F requests, meeting minutes, and private maintenance photo storage. The standalone `/portal` route shows the signed-in resident's own tickets and assigned assets. Council users can review Form B/F preview requests at `/forms` and draft or publish meeting minutes at `/minutes`.

The Form B/F workspace is a data-backed draft preview only: it does not collect payment, certify statutory forms, or issue official PDFs. Minutes formatting uses a local deterministic template, not an AI service, and publishing makes minutes visible in the member portal without sending email. Emergency broadcast delivery is not connected. Do not apply the migration to the hosted project until the project owner explicitly confirms that change; for local development, apply migrations to the local Supabase instance only.
