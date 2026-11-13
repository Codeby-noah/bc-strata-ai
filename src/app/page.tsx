import type { Metadata } from "next";
import {
  AboutPicker,
  HeroActions,
  HubPreview,
  JobGrid,
  LandingDemoProvider,
  StartPath,
} from "@/components/home/LandingDemo";
import { SavingsBand } from "@/components/home/SavingsBand";
import { Pricing, PublicFooter, PublicHeader, Questions } from "@/components/site/PublicSite";

export const metadata: Metadata = {
  title: {
    absolute: "StrataDock | Software for self-managed strata councils",
  },
  description:
    "StrataDock takes bylaw searches, invoice entry, repair calls, visitor passes, and repeat owner emails off a self-managed council’s plate — often reclaiming hours a month and saving on launch pricing vs regular rates.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PublicHeader cornerHref="/login" cornerLabel="Log in" />
      <LandingDemoProvider>
        <main>
          <section className="border-b border-slate-200 bg-slate-50">
            <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,32rem)_minmax(28rem,1fr)] lg:items-center lg:gap-14">
              <div>
                <p className="text-sm font-semibold text-blue-700">For councils that manage the building themselves</p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Less time on the council work you already do.
                </h1>
                <p className="mt-5 text-lg leading-8 text-slate-600">
                  Bylaw questions, invoices, repair calls, visitor passes, and “can you resend the minutes?” usually live in someone’s inbox. This workspace takes those jobs out of email. Residents file their own requests and read notices themselves. Council reviews, approves, and keeps the record.
                </p>
                <p className="mt-4 text-sm font-semibold leading-6 text-slate-800">
                  Typical councils recover about{" "}
                  <span className="text-blue-800">5–12+ volunteer hours a month</span> on repeat admin. The
                  workspace is often{" "}
                  <span className="text-blue-800">5–12× less</span> than typical BC licensed management fees
                  (often ~$1,500–$2,500+/month) — about <span className="text-blue-800">10× less</span> at common
                  minimums vs $139 launch pricing, without hiring a management company.
                </p>
                <HeroActions />
              </div>
              <HubPreview />
            </div>
          </section>

          <SavingsBand />

          <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <AboutPicker />
          </section>

          <section className="border-y border-slate-200 bg-slate-50">
            <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
              <JobGrid />
            </div>
          </section>

          <Pricing />

          <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <StartPath />
          </section>

          <Questions />
        </main>
      </LandingDemoProvider>
      <PublicFooter />
    </div>
  );
}
