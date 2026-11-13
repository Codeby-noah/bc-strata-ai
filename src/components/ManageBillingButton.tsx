"use client";

import { useFormStatus } from "react-dom";
import { createCustomerPortalSession } from "@/lib/stripe/portal";
import { LoadingSpinner } from "@/components/LoadingSpinner";

function SubmitLabel({ idle }: { idle: string }) {
  const { pending } = useFormStatus();
  return (
    <span className="inline-flex items-center gap-2">
      {pending ? <LoadingSpinner /> : null}
      {pending ? "Opening Stripe…" : idle}
    </span>
  );
}

export function ManageBillingButton({
  label = "Manage Billing",
  className = "rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <form action={createCustomerPortalSession}>
      <button type="submit" className={className}>
        <SubmitLabel idle={label} />
      </button>
    </form>
  );
}
