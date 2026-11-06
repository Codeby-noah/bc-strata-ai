import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { InvoiceReview } from "@/components/InvoiceReview";
import { LedgerAccountForm } from "@/components/LedgerAccountForm";
import {
  LedgerTransactions,
  type LedgerTransaction,
} from "@/components/LedgerTransactions";
import { canManageFinance, canReadInvoices } from "@/lib/strata/roles";
import { getStrataContext } from "@/lib/strata/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Financial Ledgers",
};

type AccountBalance = {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  fund: string;
  current_balance: number | string;
  is_active: boolean;
};

type InvoiceRecord = {
  id: string;
  storage_path: string;
  file_name: string;
  status: string;
  vendor: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  subtotal: number | string | null;
  tax: number | string | null;
  total: number | string | null;
  suggested_account_code: string | null;
  suggested_fund: string | null;
  extraction: { confidence?: string; notes?: string[] } | null;
  created_at: string;
};

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

export default async function LedgersPage() {
  const context = await getStrataContext();
  const strata = context?.activeMembership;
  if (!strata) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ledger_account_balances")
    .select("account_id, account_code, account_name, account_type, fund, current_balance, is_active")
    .eq("strata_id", strata.id)
    .order("account_code", { ascending: true });

  if (error) {
    throw new Error("Unable to load the financial ledgers.");
  }

  const rows = (data ?? []) as unknown as AccountBalance[];
  const canProcessInvoices = canManageFinance(strata.role);
  const canReviewInvoices = canReadInvoices(strata.role);

  const { data: entryData, error: entryError } = await supabase
    .from("journal_entries")
    .select("id, entry_date, reference, description")
    .eq("strata_id", strata.id)
    .order("entry_date", { ascending: false })
    .limit(100);
  if (entryError) {
    throw new Error("Unable to load the transaction history.");
  }
  const entries = (entryData ?? []) as Array<{
    id: string;
    entry_date: string;
    reference: string | null;
    description: string;
  }>;

  let transactions: LedgerTransaction[] = [];
  if (entries.length > 0) {
    const [lineResult, accountResult] = await Promise.all([
      supabase
        .from("journal_lines")
        .select("journal_entry_id, account_id, debit, credit")
        .eq("strata_id", strata.id)
        .in("journal_entry_id", entries.map((entry) => entry.id)),
      supabase
        .from("ledger_accounts")
        .select("id, fund")
        .eq("strata_id", strata.id),
    ]);
    if (lineResult.error || accountResult.error) {
      throw new Error("Unable to load the transaction details.");
    }

    const fundsByAccount = new Map(
      (accountResult.data ?? []).map((account) => [account.id, account.fund]),
    );
    const linesByEntry = new Map<
      string,
      Array<{ account_id: string; debit: number | string }>
    >();
    for (const line of lineResult.data ?? []) {
      const entryLines = linesByEntry.get(line.journal_entry_id) ?? [];
      entryLines.push({ account_id: line.account_id, debit: line.debit });
      linesByEntry.set(line.journal_entry_id, entryLines);
    }

    transactions = entries.map((entry) => {
      const entryLines = linesByEntry.get(entry.id) ?? [];
      const funds = new Set(
        entryLines
          .map((line) => fundsByAccount.get(line.account_id))
          .filter((fund): fund is string => Boolean(fund)),
      );
      const fund =
        funds.size > 1
          ? "split"
          : funds.has("operating")
            ? "operating"
            : funds.has("contingency")
              ? "contingency"
              : "other";
      return {
        ...entry,
        amount: entryLines.reduce((sum, line) => sum + Number(line.debit), 0),
        fund,
      };
    });
  }

  let invoices: InvoiceRecord[] = [];
  if (canReviewInvoices) {
    const { data: invoiceData, error: invoiceError } = await supabase
      .from("invoices")
      .select(
        "id, storage_path, file_name, status, vendor, invoice_number, invoice_date, due_date, subtotal, tax, total, suggested_account_code, suggested_fund, extraction, created_at",
      )
      .eq("strata_id", strata.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (invoiceError) {
      throw new Error("Unable to load the invoice review queue.");
    }
    invoices = (invoiceData ?? []) as unknown as InvoiceRecord[];
  }

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="Financial Ledgers"
        description="Account balances calculated from immutable, balanced journal entries for the active strata."
      />

      <LedgerTransactions
        transactions={transactions}
        accounts={rows
          .filter((row) => row.is_active)
          .map((row) => ({
            id: row.account_id,
            account_code: row.account_code,
            account_name: row.account_name,
            fund: row.fund,
          }))}
        canPost={canProcessInvoices}
      />

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <p className="text-sm font-medium text-ink-900">Account balances</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-pine-700">
            {rows.length} {rows.length === 1 ? "account" : "accounts"}
          </p>
        </div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-stone-100 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Account</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Fund</th>
                  <th className="px-5 py-3 font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((row) => (
                  <tr key={row.account_code} className="text-ink-900">
                    <td className="px-5 py-3.5 font-medium">
                      {row.account_code} · {row.account_name}
                    </td>
                    <td className="px-5 py-3.5 capitalize">{row.account_type}</td>
                    <td className="px-5 py-3.5 capitalize">{row.fund}</td>
                    <td className="px-5 py-3.5 tabular-nums">
                      {currency.format(Number(row.current_balance))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center text-slate-500">
            <FolderOpenIcon />
            <p className="mt-3 font-medium text-slate-700">No ledger accounts yet</p>
            <p className="mt-1 max-w-md text-sm">
              Create your first accounts below to start tracking this strata’s operating and reserve funds.
            </p>
          </div>
        )}
        {canReviewInvoices ? (
          <InvoiceReview
            invoices={invoices}
            strataId={strata.id}
            canProcess={canProcessInvoices}
          />
        ) : (
          <p className="mt-8 rounded-xl border border-stone-200 bg-white p-5 text-sm text-ink-500">
            Invoice OCR and financial review are available to strata administrators and council members.
          </p>
        )}
      </div>
      {canProcessInvoices ? <LedgerAccountForm /> : null}
    </div>
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
