import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/site/PublicSite";

export const metadata = {
  title: "Privacy Policy | StrataDock",
  description:
    "Privacy policy for StrataDock, including how bylaw and ledger data is handled and the AI no-training rule.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <PublicHeader cornerHref="/login" cornerLabel="Log in" />
      <main className="px-5 py-12 text-slate-900 sm:px-8">
        <article className="prose prose-slate mx-auto max-w-3xl rounded-3xl border border-gray-100 bg-white px-7 py-10 shadow-sm sm:px-12 sm:py-12">
          <Link
            href="/"
            className="not-prose inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            <span aria-hidden>←</span> Back to Home
          </Link>
          <p className="not-prose mt-8 text-sm font-semibold text-blue-600">
            StrataDock · Effective November 10, 2026
          </p>
          <h1>Privacy Policy</h1>
          <p>
            This policy explains how StrataDock (“we”) handles personal
            information and strata records in the workspace. The person
            responsible for privacy questions is StrataDock. Write to{" "}
            <a href="mailto:stratadock@gmail.com">stratadock@gmail.com</a>.
          </p>

          <h2>1. Who is responsible</h2>
          <p>
            StrataDock is responsible for personal information it handles to
            run the Service. A strata that uploads owner, resident, or vendor
            information is responsible for having the authority to put that
            information into the workspace. Questions about a particular
            strata’s records can be sent to that strata’s administrator. Questions
            about this Service can be sent to stratadock@gmail.com.
          </p>

          <h2>2. Information the Service may handle</h2>
          <p>
            Depending on how a strata uses the Service, this may include account
            email addresses, membership and role information, bylaws and other
            documents, ledger entries and invoices, maintenance requests and
            photos, parking assignments, meeting materials, support messages, and
            technical logs needed to secure and operate the Service. Do not
            submit information that is not needed for the strata’s work.
          </p>

          <h2>3. Purposes</h2>
          <p>
            We use this information to authenticate users, provide the workspace,
            keep strata records organized, process support requests, protect the
            Service, troubleshoot problems, bill the subscription, and meet legal
            obligations. We do not sell personal information.
          </p>

          <h2>4. Service providers and the AI no-training rule</h2>
          <p>
            We use Supabase for accounts, the database, and file storage. Stripe
            processes subscription payments. When a council member turns on
            document indexing, asks a bylaw question, or chooses to read an
            invoice, the relevant document text or file is sent to OpenAI to
            perform that task.
          </p>
          <p>
            Customer bylaw and ledger data will not be used to train public AI
            models. We send that content only to provide the feature the council
            requested. We do not use it to train a public model, and we do not
            allow the AI provider to use customer bylaw documents, ledger
            entries, invoices, or related workspace content to train public
            models.
          </p>

          <h2>5. Where information is processed</h2>
          <p>
            Supabase, Stripe, and OpenAI may process information in Canada or in
            another country where that provider operates. This policy does not
            promise that every copy stays in Canada, and it is not a
            certification under the British Columbia Personal Information
            Protection Act. A strata that needs a residency or PIPA opinion
            should review the live provider settings with its own adviser.
          </p>

          <h2>6. Safeguards and access</h2>
          <p>
            The Service uses signed-in sessions, strata membership checks,
            database row policies, and private file storage so one strata cannot
            read another strata’s workspace. Administrators control who is
            invited. These measures reduce risk. They do not make storage or
            transmission risk-free.
          </p>

          <h2>7. Retention, export, and deletion</h2>
          <p>
            We keep workspace information while the subscription is active and
            for the export window in the Terms of Service. After cancellation,
            the workspace remains readable for 30 days so an administrator or
            treasurer can export the ledger CSV and download or print documents
            and other records. After those 30 days we permanently delete the
            workspace, except for information we must keep for a legal duty or
            for a billing, security, or dispute record.
          </p>
          <p>
            You may ask for access to, or correction of, your account
            information by emailing stratadock@gmail.com. We may need to confirm
            that the request comes from the account holder or from an authorized
            representative of the strata.
          </p>

          <h2>8. Questions</h2>
          <p>
            Email{" "}
            <a href="mailto:stratadock@gmail.com">stratadock@gmail.com</a> with
            privacy questions or requests.
          </p>

          <h2>9. Changes to this policy</h2>
          <p>
            If we change how we handle information in a material way, we will
            update this page and email the strata administrator before the
            change applies. The date at the top of this page is the current
            effective date.
          </p>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
