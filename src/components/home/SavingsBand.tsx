const savingsStats = [
  {
    label: "Volunteer time back",
    value: "5–12+ hrs",
    unit: "per month",
    detail:
      "Typical range once bylaws, invoice re-entry, repair pings, visitor passes, and “resend the minutes?” stop living in separate email threads.",
  },
  {
    label: "Year-one subscription",
    value: "$480",
    unit: "saved vs $179/mo",
    detail:
      "$139 CAD a month for the first 12 months after the free trial — $40 less than the regular council workspace price each month.",
  },
  {
    label: "vs licensed management",
    value: "5–12×",
    unit: "less than typical PM fees",
    detail:
      "In BC, full-service licensed strata management often lands around $1,500–$2,500+ per month for many buildings (roughly $30–$60 per unit, plus common monthly minimums). At $139/month launch pricing, one council workspace is often about 10× less than a $1,500 management bill — and still not the same service.",
  },
] as const;

export function SavingsBand() {
  return (
    <section id="savings" className="scroll-mt-20 border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
            Time and money councils often recover
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Rough ranges for a typical self-managed building in BC. Licensed property managers charge per
            building (often per unit with a monthly minimum); StrataDock is one flat software subscription for
            volunteers who already self-manage. Your results depend on unit count and how much still runs through
            personal inboxes today.
          </p>
        </div>
        <dl className="mt-10 grid gap-4 sm:grid-cols-3">
          {savingsStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-7"
            >
              <dt className="text-sm font-semibold text-slate-500">{stat.label}</dt>
              <dd className="mt-3">
                <p className="text-4xl font-bold tracking-tight text-slate-950">{stat.value}</p>
                <p className="mt-1 text-sm font-semibold text-blue-800">{stat.unit}</p>
              </dd>
              <p className="mt-4 text-sm leading-6 text-slate-600">{stat.detail}</p>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-sm leading-6 text-slate-500">
          Illustrative ranges only — not a guarantee. Management-fee benchmarks vary by city, building size, and
          contract scope (caretaking, accounting, after-hours). StrataDock is council software, not a licensed
          strata management company; it does not replace lawyers, accountants, engineers, insurers, or on-site
          managers.
        </p>
      </div>
    </section>
  );
}
