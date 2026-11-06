"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { LedgerTransaction } from "@/components/LedgerTransactions";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";

type AccountOption = {
  id: string;
  account_code: string;
  account_name: string;
  fund: string;
};

const fieldClass =
  "mt-1.5 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-zinc-100";

export function JournalEntryForm({
  accounts,
  onPosted,
}: {
  accounts: AccountOption[];
  onPosted: (transaction: LedgerTransaction) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [entryDate, setEntryDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10);
  });
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [fundType, setFundType] = useState("operating");
  const [debitAccountId, setDebitAccountId] = useState("");
  const [creditAccountId, setCreditAccountId] = useState("");

  const availableAccounts =
    fundType === "split"
      ? accounts
      : accounts.filter((account) => account.fund === fundType);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    if (!debitAccountId || !creditAccountId || debitAccountId === creditAccountId) {
      setMessage("Choose two different ledger accounts.");
      toast.error("Choose two different ledger accounts.");
      return;
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage("Enter an amount greater than zero.");
      toast.error("Enter an amount greater than zero.");
      return;
    }

    setBusy(true);
    setMessage("");
    const payload = {
      entry_date: entryDate,
      reference,
      description,
      debit_account_id: debitAccountId,
      credit_account_id: creditAccountId,
      amount: numericAmount,
    };

    try {
      const response = await fetch("/api/finance/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        error?: string;
        id?: string;
        fieldErrors?: Record<string, string[] | undefined>;
      };
      if (!response.ok) {
        setMessage(result.error ?? "The journal entry could not be posted.");
        setFieldErrors(
          Object.fromEntries(
            Object.entries(result.fieldErrors ?? {})
              .filter(([, errors]) => errors?.length)
              .map(([field, errors]) => [field, errors?.[0] ?? "Invalid value."]),
          ),
        );
        toast.error(result.error ?? "The journal entry could not be posted.");
        return;
      }
      if (!result.id) {
        setMessage("The entry was saved, but its confirmation was incomplete. Refresh to verify it.");
        toast.error("The entry was saved, but its confirmation was incomplete.");
        router.refresh();
        return;
      }

      const debitAccount = accounts.find((account) => account.id === debitAccountId);
      const creditAccount = accounts.find((account) => account.id === creditAccountId);
      const actualFunds = new Set(
        [debitAccount?.fund, creditAccount?.fund].filter(
          (fund): fund is string => Boolean(fund),
        ),
      );
      const transactionFund: LedgerTransaction["fund"] =
        actualFunds.size > 1
          ? "split"
          : actualFunds.has("operating")
            ? "operating"
            : actualFunds.has("contingency")
              ? "contingency"
              : "other";
      onPosted({
        id: result.id,
        entry_date: entryDate,
        description: description.trim(),
        reference: reference.trim() || null,
        amount: numericAmount,
        fund: transactionFund,
      });

      setDescription("");
      setReference("");
      setAmount("");
      setDebitAccountId("");
      setCreditAccountId("");
      setMessage("Balanced journal entry posted.");
      toast.success("Journal entry saved successfully");
      router.refresh();
    } catch {
      setMessage("The journal entry could not be posted. Check your connection and try again.");
      toast.error("The journal entry could not be posted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">Record a transaction</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        Each entry debits one account and credits another for the same amount.
        Posted entries are permanent; corrections require a new reversing entry.
      </p>
      {accounts.length < 2 ? (
        <p className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-slate-500">
          At least two active ledger accounts must be set up before you can post an entry.
        </p>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-ink-700">
            Entry date
            <input
              name="entry_date"
              type="date"
              required
              value={entryDate}
              onChange={(event) => setEntryDate(event.target.value)}
              disabled={busy}
              className={fieldClass}
            />
            {fieldErrors.entry_date ? <span className="mt-1 block text-sm text-red-600">{fieldErrors.entry_date}</span> : null}
          </label>
          <label className="text-sm font-medium text-ink-700">
            Reference (optional)
            <input
              name="reference"
              maxLength={120}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              disabled={busy}
              className={fieldClass}
            />
          </label>
          <label className="text-sm font-medium text-ink-700 sm:col-span-2">
            Description
            <input
              name="description"
              required
              maxLength={500}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={busy}
              className={fieldClass}
            />
            {fieldErrors.description ? <span className="mt-1 block text-sm text-red-600">{fieldErrors.description}</span> : null}
          </label>
          <label className="text-sm font-medium text-ink-700">
            Fund type
            <select
              value={fundType}
              onChange={(event) => {
                setFundType(event.target.value);
                setDebitAccountId("");
                setCreditAccountId("");
              }}
              disabled={busy}
              className={fieldClass}
            >
              <option value="operating">Operating</option>
              <option value="contingency">CRF</option>
              <option value="other">Other</option>
              <option value="split">Transfer between funds</option>
            </select>
          </label>
          <label className="text-sm font-medium text-ink-700">
            Amount (CAD)
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={busy}
              className={fieldClass}
            />
            {fieldErrors.amount ? <span className="mt-1 block text-sm text-red-600">{fieldErrors.amount}</span> : null}
          </label>
          <label className="text-sm font-medium text-ink-700">
            Debit account
            <select
              name="debit_account_id"
              required
              value={debitAccountId}
              onChange={(event) => setDebitAccountId(event.target.value)}
              disabled={busy}
              className={fieldClass}
            >
              <option value="">Choose account</option>
              {availableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_code} · {account.account_name} ({account.fund})
                </option>
              ))}
            </select>
            {fieldErrors.debit_account_id ? <span className="mt-1 block text-sm text-red-600">{fieldErrors.debit_account_id}</span> : null}
          </label>
          <label className="text-sm font-medium text-ink-700">
            Credit account
            <select
              name="credit_account_id"
              required
              value={creditAccountId}
              onChange={(event) => setCreditAccountId(event.target.value)}
              disabled={busy}
              className={fieldClass}
            >
              <option value="">Choose account</option>
              {availableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_code} · {account.account_name} ({account.fund})
                </option>
              ))}
            </select>
            {fieldErrors.credit_account_id ? <span className="mt-1 block text-sm text-red-600">{fieldErrors.credit_account_id}</span> : null}
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                {busy ? <LoadingSpinner /> : null}
                {busy ? "Saving…" : "Post balanced entry"}
              </span>
            </button>
          </div>
        </form>
      )}
      {message ? (
        <p className="mt-4 text-sm font-medium text-slate-700" role="status">{message}</p>
      ) : null}
    </section>
  );
}
