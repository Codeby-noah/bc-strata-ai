"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const fieldClass =
  "mt-1.5 h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-ink-900";

export function LedgerAccountForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function addAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/finance/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_code: values.get("account-code"),
          account_name: values.get("account-name"),
          account_type: values.get("account-type"),
          fund: values.get("fund"),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "The account could not be added.");
        return;
      }
      form.reset();
      setMessage("Ledger account added.");
      router.refresh();
    } catch {
      setMessage("The account could not be added. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="font-serif text-xl text-navy-950">Set up chart of accounts</h2>
      <p className="mt-1 text-sm leading-6 text-ink-500">
        Choose your strata’s account codes and assign each account to the
        Operating Fund, Contingency Reserve Fund (CRF), or another fund.
      </p>
      <form
        onSubmit={(event) => void addAccount(event)}
        className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <label className="text-sm font-medium text-ink-700">
          Account code
          <input name="account-code" required maxLength={30} className={fieldClass} />
        </label>
        <label className="text-sm font-medium text-ink-700">
          Account name
          <input name="account-name" required maxLength={120} className={fieldClass} />
        </label>
        <label className="text-sm font-medium text-ink-700">
          Account type
          <select name="account-type" required className={fieldClass}>
            <option value="asset">Asset</option>
            <option value="liability">Liability</option>
            <option value="equity">Equity</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </label>
        <label className="text-sm font-medium text-ink-700">
          Fund
          <select name="fund" required className={fieldClass}>
            <option value="operating">Operating Fund</option>
            <option value="contingency">Contingency Reserve Fund (CRF)</option>
            <option value="other">Other</option>
          </select>
        </label>
        <div className="flex items-center gap-3 sm:col-span-2 xl:col-span-4">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-pine-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-600 disabled:opacity-70"
          >
            {busy ? "Saving…" : "Add account"}
          </button>
          {message ? (
            <p className="text-sm text-ink-700" role="status">{message}</p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
