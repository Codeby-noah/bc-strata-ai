"use client";

import { useState } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export function BillingSubscribeButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function startCheckout() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        setMessage(result.error ?? "Checkout could not be started.");
        return;
      }
      window.location.assign(result.url);
    } catch {
      setMessage("Checkout could not be started. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void startCheckout()}
        disabled={busy}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? <LoadingSpinner /> : null}
        {busy ? "Connecting to Stripe…" : "Lock In $119/mo Launch Price"}
      </button>
      {message ? (
        <p role="alert" className="mt-3 text-sm text-red-700">{message}</p>
      ) : null}
    </div>
  );
}
