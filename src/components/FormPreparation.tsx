"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const fieldClass =
  "mt-1.5 h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-pine-700 focus:ring-2 focus:ring-pine-700/20";

export function FormPreparation({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/workspace/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_type: values.get("form_type"),
          unit_number: values.get("unit_number"),
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "The form record could not be saved.");
        return;
      }
      form.reset();
      setMessage("Draft record created. This does not generate an official Form B or Form F.");
      router.refresh();
    } catch {
      setMessage("The form record could not be saved. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="font-serif text-lg text-navy-950">Start a Form B/F record</h2>
      <p className="mt-1 text-sm leading-6 text-ink-500">
        This creates a draft tracker only. Official form generation and certification are not enabled.
      </p>
      {canManage ? (
        <form onSubmit={(event) => void submit(event)} className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-sm font-medium text-ink-700">
            Form type
            <select name="form_type" className={fieldClass}>
              <option value="form_b">Form B · Information Certificate</option>
              <option value="form_f">Form F · Certificate of Payment</option>
            </select>
          </label>
          <label className="text-sm font-medium text-ink-700">
            Unit number (optional)
            <input name="unit_number" maxLength={40} className={fieldClass} />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-pine-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-600 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Create draft"}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-ink-500">
          Only council members can create Form B/F draft records.
        </p>
      )}
      {message ? <p className="mt-4 text-sm text-ink-700" role="status">{message}</p> : null}
    </section>
  );
}
