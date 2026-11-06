import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { BillingSubscribeButton } from "@/components/BillingSubscribeButton";
import { getStrataContext } from "@/lib/strata/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Subscription Billing" };
export const instant = false;

const includedFeatures = [
  "Multi-tenant Council Hub & Resident Portal",
  "AI-Powered Document & Bylaw Vault",
  "Fund Accounting Ledger & Receipt Uploads",
  "Automated Form B & Form F Generation",
  "Maintenance Ticketing & Asset Tracking",
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string | string[] }>;
}) {
  const context = await getStrataContext();
  if (!context) return null;
  const strata = context.activeMembership;
  if (!strata || strata.role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <span aria-hidden>←</span>
          Back to Home
        </Link>
        <p className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Only a strata administrator can manage billing.
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const checkoutState =
    typeof params.checkout === "string" ? params.checkout : null;
  const supabase = await createSupabaseServerClient();
  const { data: billing, error } = await supabase
    .from("strata_billing")
    .select("subscription_status, current_period_end")
    .eq("strata_id", strata.id)
    .maybeSingle();

  const configMissing = Boolean(error);
  const status = billing?.subscription_status ?? "not subscribed";
  const active = ["active", "trialing"].includes(status);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
      >
        <span aria-hidden>←</span>
        Back to Home
      </Link>

      {checkoutState === "success" ? (
        <p
          role="status"
          className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          Checkout completed. Stripe is confirming the subscription. Refresh this page after confirmation to see the updated status.
        </p>
      ) : checkoutState === "cancelled" ? (
        <p
          role="status"
          className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
        >
          Checkout was cancelled. No subscription was started.
        </p>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-xl shadow-slate-200/60">
        <div className="px-6 py-9 sm:px-12 sm:py-12">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
              Launch Special
            </span>
            <p className="mt-6 text-sm font-semibold text-slate-500">
              BC Strata AI · Council
            </p>
            <p className="mt-5 text-lg font-medium text-slate-400">
              <span className="sr-only">Standard price: </span>
              <s>$139</s>
              <span className="ml-1 text-sm">CAD / month</span>
            </p>
            <h1 className="mt-1 text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
              $119
              <span className="ml-2 text-xl font-semibold text-slate-600">
                / month
              </span>
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Introductory launch rate locked in for your first 12 months.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-gray-100 bg-zinc-50/80 p-5 sm:p-6">
            <p className="mb-4 text-sm font-semibold text-slate-900">
              Everything your strata needs
            </p>
            <ul className="space-y-3.5">
              {includedFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 text-sm leading-6 text-slate-700"
                >
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            {configMissing ? (
              <p className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                Billing database setup is not available yet. Apply the prepared
                billing migration before subscribing.
              </p>
            ) : active ? (
              <div className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                <p>Your subscription is {status}.</p>
                {billing?.current_period_end ? (
                  <p className="mt-1 text-xs font-normal">
                    Current period ends{" "}
                    {new Date(billing.current_period_end).toLocaleDateString(
                      "en-CA",
                    )}
                  </p>
                ) : null}
              </div>
            ) : (
              <BillingSubscribeButton />
            )}
          </div>

          <div className="mt-6 border-t border-gray-100 pt-5 text-center">
            <p className="text-sm font-medium text-slate-700">{strata.name}</p>
            <p className="mt-1 text-xs text-slate-500">
              LMS {strata.strataNumber}
            </p>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              Billed monthly in CAD. Applicable taxes, if any, are calculated
              by Stripe Checkout. Subscription management and cancellation
              links are not configured in this MVP.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
