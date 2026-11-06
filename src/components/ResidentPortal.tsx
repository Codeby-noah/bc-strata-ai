"use client";

import Link from "next/link";
import { useState } from "react";
import { NewTicketModal } from "@/components/NewTicketModal";
import { signOut } from "@/lib/auth/actions";

export type ResidentTicket = {
  id: string;
  title: string;
  location: string;
  urgency: string;
  status: string;
  created_at: string;
};

export type ResidentParkingAsset = {
  id: string;
  unit_number: string;
  stall_number: string;
  asset_type: string;
};

export type PublishedMinute = {
  id: string;
  meeting_date: string;
  meeting_type: string;
  formatted_content: string | null;
};

const ticketStatusClasses: Record<string, string> = {
  open: "bg-amber-50 text-amber-800",
  "in-progress": "bg-blue-50 text-blue-800",
  resolved: "bg-emerald-50 text-emerald-800",
  closed: "bg-slate-100 text-slate-700",
};

const assetLabels: Record<string, string> = {
  visitor_pass: "Visitor pass",
  resident_stall: "Resident stall",
  locker: "Locker",
};

export function ResidentPortal({
  strataId,
  strataName,
  tickets,
  parkingAssets,
  publishedMinutes,
}: {
  strataId: string;
  strataName: string;
  tickets: ResidentTicket[];
  parkingAssets: ResidentParkingAsset[];
  publishedMinutes: PublishedMinute[];
}) {
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-gray-200 bg-white/90 backdrop-blur-md">
        <nav className="relative mx-auto flex h-16 max-w-4xl items-center justify-between px-5 sm:px-8">
          <Link href="/portal" className="text-lg font-semibold tracking-tight text-slate-900">
            BC Strata AI
          </Link>
          <div className="flex items-center gap-5">
            <div className="hidden items-center gap-5 md:flex">
              <a href="#requests" className="text-sm font-medium text-slate-600 hover:text-slate-900">Requests</a>
              <a href="#parking" className="text-sm font-medium text-slate-600 hover:text-slate-900">Parking</a>
              <a href="#minutes" className="text-sm font-medium text-slate-600 hover:text-slate-900">Minutes</a>
              <span className="max-w-40 truncate text-sm text-slate-500">{strataName}</span>
              <form action={signOut}>
                <button type="submit" className="text-sm font-medium text-slate-600 hover:text-slate-900">Sign out</button>
              </form>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="resident-mobile-nav"
              aria-label={menuOpen ? "Close resident navigation" : "Open resident navigation"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-slate-700 md:hidden"
            >
              <MenuIcon />
            </button>
          </div>
          {menuOpen ? (
            <div id="resident-mobile-nav" className="absolute right-4 top-14 z-30 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg md:hidden">
              <p className="truncate px-3 py-2 text-xs font-medium text-slate-400">{strataName}</p>
              <a href="#requests" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-zinc-50">My requests</a>
              <a href="#parking" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-zinc-50">Parking &amp; assets</a>
              <a href="#minutes" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-zinc-50">Meeting minutes</a>
              <form action={signOut} className="border-t border-gray-100 pt-2">
                <button type="submit" className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-zinc-50">Sign out</button>
              </form>
            </div>
          ) : null}
        </nav>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-5 py-8 sm:px-8 sm:py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <span aria-hidden>←</span>
          Back to Home
        </Link>
        {!alertDismissed ? (
          <section
            aria-label="Emergency broadcast status"
            className="flex items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950"
          >
            <div>
              <p className="text-sm font-semibold">Emergency broadcasts</p>
              <p className="mt-1 text-sm text-amber-900">
                Live council alerts are not connected yet. No broadcast data is being shown here.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAlertDismissed(true)}
              aria-label="Dismiss broadcast notice"
              className="rounded-lg px-2 py-1 text-amber-800 hover:bg-amber-100"
            >
              ×
            </button>
          </section>
        ) : null}

        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600">Resident services</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
              Your Strata Portal
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Request repairs and review your assigned parking and property assets.
            </p>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Resident services
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              Submit a new request
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Tell council about a repair or property concern. Add a photo if it helps explain the issue.
            </p>
          </div>
          <NewTicketModal strataId={strataId} />
        </section>

        <section id="requests" className="scroll-mt-20 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Your active tickets</h2>
            <p className="mt-1 text-sm text-slate-500">Follow each request from submission through resolution.</p>
          </div>
          {tickets.length ? (
            <ol className="divide-y divide-gray-100">
              {tickets.map((ticket) => (
                <li key={ticket.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-medium text-slate-900">{ticket.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {ticket.location} · {ticket.urgency} urgency ·{" "}
                      {new Date(ticket.created_at).toLocaleDateString("en-CA")}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      ticketStatusClasses[ticket.status] ?? "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {ticket.status.replaceAll("-", " ")}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <RepairEmptyIcon />
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">No maintenance requests yet</h3>
              <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                Click above to submit your first ticket and follow its status here.
              </p>
            </div>
          )}
        </section>

        <section id="parking" className="scroll-mt-20 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Assigned Parking</h2>
            <p className="mt-1 text-sm text-slate-500">
              Assignments registered to your account in this strata.
            </p>
          </div>
          {parkingAssets.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Asset</th>
                    <th className="px-5 py-3 font-semibold">Unit</th>
                    <th className="px-5 py-3 font-semibold">Stall / number</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {parkingAssets.map((asset) => (
                    <tr key={asset.id}>
                      <td className="px-5 py-3.5 text-slate-800">
                        {assetLabels[asset.asset_type] ?? asset.asset_type}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{asset.unit_number}</td>
                      <td className="px-5 py-3.5 text-slate-600">{asset.stall_number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-8 text-sm text-slate-500">
              No parking or property assets are assigned to your account yet. Contact council if this looks incorrect.
            </p>
          )}
        </section>

        <section id="minutes" className="scroll-mt-20 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Published meeting minutes</h2>
            <p className="mt-1 text-sm text-slate-500">
              Official records shared by council with this strata.
            </p>
          </div>
          {publishedMinutes.length ? (
            <ul className="divide-y divide-gray-100">
              {publishedMinutes.map((minutes) => (
                <li key={minutes.id} className="px-5 py-4">
                  <h3 className="font-medium text-slate-900">
                    {minutes.meeting_type} ·{" "}
                    {new Date(`${minutes.meeting_date}T00:00:00`).toLocaleDateString("en-CA")}
                  </h3>
                  {minutes.formatted_content ? (
                    <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-slate-600">
                      {minutes.formatted_content}
                    </pre>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      No formatted minutes are available for this record.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-sm text-slate-500">
              Council hasn’t published any meeting minutes yet.
            </p>
          )}
        </section>
        <p className="text-center text-xs text-slate-400">
          Your requests and assigned records are protected by your strata membership.
        </p>
      </main>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden>
      <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function RepairEmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
      <path
        d="M14.5 6.5a5 5 0 0 0-6.7 6.7l-4.1 4.1a2.1 2.1 0 0 0 3 3l4.1-4.1a5 5 0 0 0 6.7-6.7l-3 3-3-3 3-3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
