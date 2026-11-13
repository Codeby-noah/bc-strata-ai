import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/PageHeader";
import { getStrataContext } from "@/lib/strata/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

export const instant = false;

export default async function CouncilDashboardPage() {
  await connection();
  const context = await getStrataContext();
  const strata = context?.activeMembership;
  if (!strata) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const [
    balancesResult,
    documentsResult,
    maintenanceCountResult,
    pendingFormsResult,
    draftMinutesResult,
    recentTicketsResult,
    recentEntriesResult,
    pendingInvoicesResult,
    complianceResult,
  ] = await Promise.all([
    supabase
      .from("ledger_account_balances")
      .select("account_type, fund, current_balance")
      .eq("strata_id", strata.id),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("strata_id", strata.id),
    supabase
      .from("maintenance_tickets")
      .select("id", { count: "exact", head: true })
      .eq("strata_id", strata.id)
      .or("status.eq.open,urgency.eq.emergency"),
    supabase
      .from("form_requests")
      .select("id", { count: "exact", head: true })
      .eq("strata_id", strata.id)
      .in("status", ["draft", "pending_payment"]),
    supabase
      .from("meeting_minutes")
      .select("id", { count: "exact", head: true })
      .eq("strata_id", strata.id)
      .eq("status", "draft"),
    supabase
      .from("maintenance_tickets")
      .select("id, title, status, urgency, created_at")
      .eq("strata_id", strata.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("journal_entries")
      .select("id, entry_date, description, created_at")
      .eq("strata_id", strata.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("strata_id", strata.id)
      .in("status", ["uploaded", "review_required"]),
    supabase
      .from("strata_compliance_items")
      .select("id, title, category, due_date, status")
      .eq("strata_id", strata.id)
      .eq("status", "upcoming")
      .order("due_date", { ascending: true })
      .limit(5),
  ]);

  if (
    balancesResult.error ||
    documentsResult.error ||
    maintenanceCountResult.error ||
    pendingFormsResult.error ||
    draftMinutesResult.error ||
    recentTicketsResult.error ||
    recentEntriesResult.error ||
    pendingInvoicesResult.error
  ) {
    throw new Error("Unable to load your strata dashboard.");
  }

  const balances = (balancesResult.data ?? []) as unknown as Array<{
    account_type: string;
    fund: string;
    current_balance: number | string;
  }>;
  const totalFund = (fund: string) =>
    balances
      .filter((account) => account.account_type === "asset" && account.fund === fund)
      .reduce((sum, account) => sum + Number(account.current_balance), 0);

  const maintenanceCount = maintenanceCountResult.count ?? 0;
  const pendingInvoiceCount = pendingInvoicesResult.count ?? 0;
  const deadlines = complianceResult.error ? [] : complianceResult.data ?? [];
  const governanceCount =
    (pendingFormsResult.count ?? 0) + (draftMinutesResult.count ?? 0);
  const activity = [
    ...(recentTicketsResult.data ?? []).map((ticket) => ({
      id: `ticket-${ticket.id}`,
      date: ticket.created_at,
      type: "Maintenance",
      description: ticket.title,
      status: `${ticket.status.replaceAll("-", " ")} · ${ticket.urgency}`,
    })),
    ...(recentEntriesResult.data ?? []).map((entry) => ({
      id: `entry-${entry.id}`,
      date: entry.created_at,
      type: "Ledger",
      description: entry.description,
      status: new Date(`${entry.entry_date}T00:00:00`).toLocaleDateString("en-CA"),
    })),
  ]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="A single operating view for self-managed townhouse strata corporations in British Columbia — funds, filings, and records."
      />

      <section aria-label="Executive metrics" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Financial position</p>
            <span className="text-sm font-semibold text-emerald-600" aria-label="Live ledger balances">↗</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500">Operating</p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
                {currency.format(totalFund("operating"))}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">CRF</p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
                {currency.format(totalFund("contingency"))}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Calculated from posted journal entries</p>
        </article>
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Open operations</p>
            <AlertCircleIcon />
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
            {maintenanceCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Open or marked emergency</p>
        </article>
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Invoice OCR queue</p>
            <Link
              href="/ledgers"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Review
            </Link>
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
            {pendingInvoiceCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Awaiting analysis or treasurer approval</p>
        </article>
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Governance queue</p>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
              Needs review
            </span>
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
            {governanceCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Pending Form B/F requests and draft minutes</p>
        </article>
      </section>

      {deadlines.length ? (
        <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming compliance dates</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {deadlines.map((item) => (
              <li key={item.id}>
                {item.due_date} · {item.title} · {item.category}
              </li>
            ))}
          </ul>
          <Link href="/governance/compliance" className="mt-4 inline-flex text-sm font-semibold text-blue-700">
            Open the compliance tracker
          </Link>
        </section>
      ) : null}

      <section className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Recent activity</h2>
            <p className="mt-1 text-sm text-slate-500">The latest maintenance and financial records.</p>
          </div>
          <span className="text-xs font-medium text-slate-400">Last 5 updates</span>
        </div>
        {activity.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Activity</th>
                  <th className="px-5 py-3 font-semibold">Description</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activity.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">
                      {new Date(item.date).toLocaleDateString("en-CA")}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-700">{item.type}</td>
                    <td className="min-w-48 px-5 py-3.5 text-slate-900">{item.description}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 capitalize text-slate-500">{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
            <FolderOpenIcon />
            <p className="mt-3 font-medium text-slate-700">No recent activity</p>
            <p className="mt-1 text-sm">New maintenance and journal records will appear here.</p>
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Getting started</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Your figures are calculated from this strata’s records. Add source
            documents and approved journal entries to build a reliable operating
            history.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/documents"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Open document vault
            </Link>
            <Link
              href="/ledgers"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Review ledgers
            </Link>
          </div>
        </article>

        <article className="rounded-2xl border border-blue-100 bg-blue-50 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Compliance watch
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
            Keep required records current
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Store insurance, bylaws, minutes, and depreciation reports in the
            private vault so council can prepare disclosures from source records.
            {` `}{documentsResult.count ?? 0} document(s) currently stored.
          </p>
          <Link
            href="/forms"
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Review Form B/F records
          </Link>
        </article>
      </section>

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Property operations
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            The tools councils and residents need to keep a community running.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              href: "/maintenance",
              title: "Maintenance",
              description: "Requests, contractor quotes, and work history.",
            },
            {
              href: "/amenities",
              title: "Amenity bookings",
              description: "Shared spaces and reservation availability.",
            },
            {
              href: "/parking",
              title: "Visitor parking",
              description: "Temporary passes and parking rules.",
            },
            {
              href: "/governance/voting",
              title: "Governance",
              description: "Council decisions, deadlines, and warranties.",
            },
          ].map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow-md"
            >
              <h3 className="font-semibold text-slate-900">
                {tool.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {tool.description}
              </p>
              <span className="mt-4 inline-flex text-xs font-semibold text-slate-600">
                Open workspace
                <span className="ml-1" aria-hidden>
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function AlertCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-amber-500" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.5v5M12 16h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function FolderOpenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-slate-300" aria-hidden>
      <path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h5l2 2h7A1.5 1.5 0 0 1 20.5 9v9A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 10h16" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
