"use client";

import { useState } from "react";
import { JournalEntryForm } from "@/components/JournalEntryForm";

type AccountOption = {
  id: string;
  account_code: string;
  account_name: string;
  fund: string;
};

export type LedgerTransaction = {
  id: string;
  entry_date: string;
  description: string;
  reference: string | null;
  amount: number;
  fund: "operating" | "contingency" | "other" | "split";
};

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

const fundLabels: Record<LedgerTransaction["fund"], string> = {
  operating: "Operating",
  contingency: "CRF",
  other: "Other",
  split: "Split funds",
};

export function LedgerTransactions({
  transactions,
  accounts,
  canPost,
}: {
  transactions: LedgerTransaction[];
  accounts: AccountOption[];
  canPost: boolean;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [localTransactions, setLocalTransactions] = useState<LedgerTransaction[]>([]);
  const visibleTransactions = Array.from(
    new Map(
      [...transactions, ...localTransactions].map((transaction) => [
        transaction.id,
        transaction,
      ]),
    ).values(),
  )
    .sort((left, right) => right.entry_date.localeCompare(left.entry_date))
    .slice(0, 100);

  function addTransaction(transaction: LedgerTransaction) {
    setLocalTransactions((current) =>
      [transaction, ...current.filter((item) => item.id !== transaction.id)].slice(
        0,
        100,
      ),
    );
  }

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Transactions
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Posted entries for this strata workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleTransactions.length ? (
            <button
              type="button"
              onClick={() => downloadLedgerCsv(visibleTransactions)}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Download CSV
            </button>
          ) : null}
          {canPost ? (
            <button
              type="button"
              onClick={() => setFormOpen((open) => !open)}
              aria-expanded={formOpen}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {formOpen ? "Close form" : "+ New Transaction"}
            </button>
          ) : null}
        </div>
      </div>
      {formOpen ? (
        <div className="border-b border-gray-200 bg-zinc-50 px-5 pb-5">
          <JournalEntryForm accounts={accounts} onPosted={addTransaction} />
        </div>
      ) : null}
      {visibleTransactions.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Date</th>
                <th scope="col" className="px-5 py-3 font-semibold">Description</th>
                <th scope="col" className="px-5 py-3 font-semibold">Fund Type</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">Amount</th>
                <th scope="col" className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleTransactions.map((transaction) => (
                <tr key={transaction.id} className="text-slate-700">
                  <td className="whitespace-nowrap px-5 py-4">
                    {new Date(`${transaction.entry_date}T00:00:00`).toLocaleDateString("en-CA")}
                  </td>
                  <td className="min-w-56 px-5 py-4">
                    <p className="font-medium text-slate-900">{transaction.description}</p>
                    {transaction.reference ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Ref: {transaction.reference}
                      </p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    {fundLabels[transaction.fund]}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums">
                    {currency.format(transaction.amount)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      Posted
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <LedgerEmptyIcon />
          </span>
          <h3 className="mt-4 font-semibold text-slate-900">No transactions yet</h3>
          <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
            {canPost
              ? "Create your first balanced journal entry to start building this strata’s financial history."
              : "Posted journal entries for this strata will appear here."}
          </p>
          {canPost ? (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              Create first transaction
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

function downloadLedgerCsv(transactions: LedgerTransaction[]) {
  const rows = [
    ["Date", "Description", "Reference", "Fund", "Amount", "Status"],
    ...transactions.map((transaction) => [
      transaction.entry_date,
      transaction.description,
      transaction.reference ?? "",
      fundLabels[transaction.fund],
      transaction.amount.toFixed(2),
      "Posted",
    ]),
  ];
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "strata-ledger.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function LedgerEmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
      <path
        d="M5 4.5h14v15H5zM8 8h8M8 12h8M8 16h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
