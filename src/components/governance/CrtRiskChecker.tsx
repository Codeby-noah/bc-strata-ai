"use client";

import { useState, type FormEvent } from "react";
import { checkCouncilRisk } from "@/actions/governance";

export function CrtRiskChecker() {
  const [action, setAction] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (action.trim().length < 8) return;
    setBusy(true);
    setAnswer("");
    try {
      const result = await checkCouncilRisk(action);
      setAnswer(
        result.success
          ? result.data?.answer ?? "No risk review was returned."
          : result.error ?? "The risk check could not be completed.",
      );
    } catch {
      setAnswer("The risk check could not be completed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="font-serif text-lg text-navy-950">CRT risk check</h2>
      <p className="mt-1 text-sm leading-6 text-ink-500">
        Describe an action council wants to take. The review uses this strata’s indexed bylaws and minutes, and it is not legal advice.
      </p>
      <form onSubmit={(event) => void onSubmit(event)} className="mt-4 space-y-3">
        <label className="block text-sm font-medium text-ink-700">
          Proposed action
          <textarea
            value={action}
            onChange={(event) => setAction(event.target.value)}
            minLength={8}
            maxLength={360}
            required
            className="mt-1.5 min-h-24 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
            placeholder="We want to fine a unit for a pet without a hearing."
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {busy ? "Checking records…" : "Check for risks"}
        </button>
      </form>
      {answer ? (
        <p className="mt-4 whitespace-pre-wrap rounded-lg bg-stone-50 p-4 text-sm leading-6 text-ink-800">
          {answer}
        </p>
      ) : null}
    </section>
  );
}
