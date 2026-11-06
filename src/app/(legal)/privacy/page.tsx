import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | BC Strata AI",
  description: "Draft privacy policy for BC Strata AI.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-5 py-12 text-slate-900 sm:px-8">
      <article className="prose prose-slate mx-auto max-w-3xl rounded-3xl border border-gray-100 bg-white px-7 py-10 shadow-sm sm:px-12 sm:py-12">
        <Link
          href="/"
          className="not-prose inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <span aria-hidden>←</span> Back to Home
        </Link>
        <p className="not-prose mt-8 text-sm font-semibold text-blue-600">
          BC Strata AI · Draft for privacy/legal review
        </p>
        <h1>Privacy Policy</h1>
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          Draft template only. The data hosting region, all subprocessors,
          retention settings, privacy contact, and legal compliance have not
          been independently verified here. Do not publish a claim that data is
          stored in Canada or that the Service complies with BC PIPA until the
          actual deployment and practices have been verified and reviewed by
          qualified privacy counsel.
        </p>

        <h2>1. Who is responsible</h2>
        <p>
          This policy must identify the legal entity responsible for personal
          information handled through the Service, its privacy officer, and a
          monitored contact method. Complete those details before publication.
          In this draft, “we” means the Service operator identified in the
          completed policy.
        </p>

        <h2>2. Information the Service may handle</h2>
        <p>
          Depending on how a strata configures and uses the Service, this may
          include account identifiers and contact details, membership and role
          information, workspace documents, financial entries and invoices,
          maintenance requests and photos, parking assignments, meeting
          materials, support messages, and technical logs needed to secure and
          operate the Service. Do not submit information that is not needed for
          the intended strata purpose.
        </p>

        <h2>3. Purposes and authority</h2>
        <p>
          Information may be used to authenticate users, provide workspace
          features, keep strata records organized, process support requests,
          protect the Service, troubleshoot issues, and meet legal obligations.
          The strata organization and Service operator must each determine and
          document their authority to collect, use, and disclose personal
          information. Complete the purposes, consent model, and legal basis
          with privacy counsel before launch.
        </p>

        <h2>4. Service providers and processing</h2>
        <p>
          The application is configured to use Supabase for authentication,
          database, and storage services. Stripe may process subscription
          payments when billing is enabled. Optional AI processing may send
          selected document or query content to an AI provider when that feature
          is enabled and authorized. Confirm the providers, data flows,
          contractual safeguards, access controls, and retention/deletion
          settings for the deployed environment before relying on this
          description.
        </p>

        <h2>5. Storage location and BC PIPA</h2>
        <p>
          The hosting region of the production database, file storage, backups,
          logs, and subprocessors has not been verified by this draft. Do not
          assume that all information is stored or processed in Canada. Verify
          the configured regions and cross-border processing with each provider
          and document the result before making a residency commitment.
        </p>
        <p>
          This policy is not a certification or legal determination that the
          Service or any strata’s handling of information complies with the
          British Columbia Personal Information Protection Act (PIPA).
          Compliance depends on the actual operator, purposes, consent,
          safeguards, contracts, retention, access practices, and legal
          obligations. Obtain a privacy review and make only substantiated
          compliance statements.
        </p>

        <h2>6. Safeguards and access</h2>
        <p>
          The application uses authenticated sessions, strata membership
          checks, database row-level policies, and private storage policies to
          restrict workspace access. These technical measures do not eliminate
          risk. The operator should maintain appropriate security review,
          incident response, access management, backups, and staff procedures.
        </p>

        <h2>7. Retention and deletion</h2>
        <p>
          Information should be retained only as long as needed for the
          documented purposes and applicable legal obligations. The operator
          must specify retention periods for accounts, workspace records,
          backups, logs, and provider-held copies, as well as procedures for
          access requests, corrections, deletion, and account closure.
        </p>

        <h2>8. Individual requests and questions</h2>
        <p>
          Complete and publish a monitored privacy contact before launch.
          Individuals should be able to contact the responsible organization
          with privacy questions or requests, subject to applicable law and
          identity verification. Add the operator’s legal name, mailing
          address, privacy officer contact, and response process here.
        </p>

        <h2>9. Policy updates</h2>
        <p>
          This policy should be updated when data practices, providers, or
          legal requirements change. The finalized policy should state its
          effective date and how material changes will be communicated.
        </p>

        <p className="not-prose mt-10 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">
          Draft template. Canada data residency and PIPA compliance are
          unverified and are not represented as established facts.
        </p>
      </article>
    </main>
  );
}
