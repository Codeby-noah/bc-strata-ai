import Link from "next/link";

export const metadata = {
  title: "BC Strata AI",
  description:
    "A modern operating system for self-managed strata councils in British Columbia.",
};

const features = [
  {
    number: "01",
    title: "AI Document Vault",
    description:
      "Your Smart Rulebook makes bylaws, meeting minutes, and depreciation reports easier to search, with source citations to help councils verify what they find.",
  },
  {
    number: "02",
    title: "Financial Transparency",
    description:
      "Keep Operating Fund and Contingency Reserve Fund (CRF) activity clear in auditable ledgers—without needing a professional accountant to follow the numbers.",
  },
  {
    number: "03",
    title: "Property Care",
    description:
      "Coordinate digital maintenance tickets and visitor parking logs in one place, so residents can report issues and councils can keep property work organized.",
  },
];

const demoLink =
  "mailto:yourname@example.com?subject=Strata%20Demo%20Inquiry";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-zinc-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-gray-200/80 bg-white/80 backdrop-blur-xl">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8"
        >
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            BC Strata AI
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/portal"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
            >
              Resident Access
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
            >
              Council Log In
            </Link>
            <a
              href={demoLink}
              className="rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:px-5"
            >
              Book a Demo
            </a>
          </div>
        </nav>
      </header>

      <section className="px-5 pb-20 pt-24 sm:px-8 sm:pb-28 sm:pt-32">
        <div className="mx-auto max-w-5xl text-center">
          <p className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            Built for British Columbia
          </p>
          <h1 className="mx-auto mt-7 max-w-4xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">
            The Automated Co-Manager for BC Stratas.
          </h1>
          <p className="mx-auto mt-7 max-w-3xl text-base leading-7 text-slate-600 sm:text-xl sm:leading-8">
            Replace expensive legacy management with an all-in-one digital
            operating system. Save your complex over $18,000 annually while
            completely automating compliance, ledgers, and maintenance.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={demoLink}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Book a Demo
            </a>
            <Link
              href="#features"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-gray-300 bg-white px-8 py-3 text-sm font-semibold text-slate-700 transition hover:border-gray-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
            >
              Explore Features
            </Link>
          </div>
          <p className="mt-5 text-xs text-slate-400">
            Purpose-built for self-managed townhouse communities.
          </p>
        </div>
      </section>

      <section
        id="features"
        aria-label="Platform features"
        className="border-t border-gray-200/80 bg-white px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              One thoughtful workspace
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Everything a Self-Managed Council Needs.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="rounded-3xl border border-gray-100 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-8"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-sm font-semibold text-blue-700">
                  {feature.number}
                </span>
                <h3 className="mt-6 text-lg font-semibold tracking-tight text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 px-5 py-12 text-slate-400 sm:px-8 sm:py-14">
        <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="max-w-xl">
            <p className="text-lg font-semibold tracking-tight text-white">
              BC Strata AI
            </p>
            <p className="mt-2 text-sm leading-6">
              A thoughtful digital workspace for British Columbia strata
              communities.
            </p>
            <div className="mt-5 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-xs leading-5 text-slate-300">
              Tenant-scoped access controls and private storage are built into
              the app. Confirm provider data regions and compliance requirements
              before launch.
            </div>
            <p className="mt-5 text-xs text-slate-500">
              © 2026 BC Strata AI. All rights reserved.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <Link
              href="/privacy"
              className="transition-colors hover:text-white"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-white"
            >
              Terms of Service
            </Link>
            <a
              href="mailto:yourname@example.com?subject=BC%20Strata%20AI%20Support"
              className="transition-colors hover:text-white"
            >
              Contact Support
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
