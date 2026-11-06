import Link from "next/link";

export const metadata = {
  title: "Terms of Service | BC Strata AI",
  description: "Draft terms of service for BC Strata AI.",
};

export default function TermsPage() {
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
          BC Strata AI · Draft for legal review
        </p>
        <h1>Terms of Service</h1>
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          Draft template only—not legal advice or a finalized agreement. Have
          BC-qualified counsel review this document, complete the operator
          identity and contact information, and confirm enforceability before
          accepting users or payments.
        </p>

        <h2>1. Agreement and eligibility</h2>
        <p>
          These terms govern access to BC Strata AI (the “Service”), operated
          by the entity identified in the Service’s finalized legal and contact
          information (“Provider,” “we,” or “us”). By creating an account or
          using the Service, you agree to the finalized terms and the Privacy
          Policy. If you use the Service for a strata corporation, you confirm
          you are authorized to act for it. “You” includes you and, where
          applicable, the organization you represent.
        </p>

        <h2>2. The Service and acceptable use</h2>
        <p>
          The Service provides online tools for organizing strata documents,
          financial records, maintenance requests, parking information, meeting
          materials, and related workflows. You must provide accurate account
          information, protect your credentials, and use the Service lawfully.
          You must not attempt to access another workspace, disrupt the
          Service, upload malicious material, or use the Service in a way that
          violates another person’s rights or applicable law.
        </p>

        <h2>3. No professional advice or licensed services</h2>
        <p>
          The Service is software only. The Provider does not provide legal,
          accounting, tax, auditing, engineering, insurance, or licensed
          property-management services through the Service. Generated
          summaries, document search results, draft forms, calculations, and
          workflow suggestions are informational tools and may be incomplete
          or incorrect. They are not professional advice, statutory
          certificates, or a substitute for review by qualified professionals.
          You are responsible for checking source records and obtaining
          appropriate advice before making or communicating decisions.
        </p>

        <h2>4. Your content and workspace responsibilities</h2>
        <p>
          You retain your rights in the documents and information you submit.
          You grant the Provider a limited permission to host, process, display,
          and back up that content as needed to operate, secure, and support the
          Service. You are responsible for having authority to submit personal
          information and strata records, configuring workspace access
          appropriately, and maintaining copies of records you need to retain.
          Workspace administrators are responsible for managing members and
          permissions.
        </p>

        <h2>5. Subscription and payment</h2>
        <p>
          Paid plans, billing frequency, taxes, renewal, cancellation, and any
          introductory pricing will be presented at purchase and in the
          applicable order or checkout. Payments are processed by the payment
          provider identified at checkout. Unless the checkout terms state
          otherwise, subscriptions renew for successive billing periods until
          cancelled. Refunds, cancellation procedures, and any launch-rate
          duration must be stated in the applicable offer and reviewed before
          sale.
        </p>

        <h2>6. Availability and changes</h2>
        <p>
          We may update, modify, or discontinue features to maintain or improve
          the Service. We do not guarantee uninterrupted or error-free
          availability. We will use reasonable efforts to provide notice of
          material changes where required by law or the finalized agreement.
        </p>

        <h2>7. Suspension and termination</h2>
        <p>
          We may suspend access where reasonably necessary to protect users,
          investigate suspected misuse, comply with law, or address a material
          breach of these terms. You may stop using the Service and cancel
          subscriptions using the applicable account or checkout process.
          Data export, retention, and deletion timelines must be confirmed in
          the finalized Privacy Policy and subscription terms.
        </p>

        <h2>8. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by applicable law, the Provider and
          its personnel will not be liable for indirect, incidental, special,
          consequential, exemplary, or punitive damages, or for lost profits,
          revenue, goodwill, data, or business opportunities arising from or
          relating to the Service. To the maximum extent permitted by law, the
          Provider’s total aggregate liability for all claims relating to the
          Service will not exceed the fees you paid to the Provider for the
          Service during the twelve months immediately before the event giving
          rise to the claim. This limit does not exclude or restrict liability
          that cannot legally be excluded or limited, including any rights or
          remedies that applicable consumer-protection law requires to remain
          available.
        </p>

        <h2>9. Indemnity</h2>
        <p>
          To the extent permitted by law and subject to review in the finalized
          agreement, you are responsible for claims arising from content you
          submit, your misuse of the Service, or your violation of these terms
          or another person’s rights. Nothing in this section requires you to
          indemnify the Provider for the Provider’s own negligence or
          misconduct where such a requirement would be unlawful.
        </p>

        <h2>10. Governing law and contact</h2>
        <p>
          The governing law, dispute-resolution process, Provider’s legal name,
          business address, and support contact must be completed and reviewed
          by counsel before publication. Nothing in these terms removes rights
          that cannot be waived under applicable law.
        </p>

        <p className="not-prose mt-10 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">
          Draft template. Do not rely on this page as a finalized contract.
          Replace the draft notices and complete legal review before launch.
        </p>
      </article>
    </main>
  );
}
