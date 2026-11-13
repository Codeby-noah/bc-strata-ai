import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ResidentPortal } from "@/components/ResidentPortal";
import { signOut } from "@/lib/auth/actions";
import { getStrataContext } from "@/lib/strata/context";
import {
  getWorkspaceSubscriptionState,
  isBillingEnforcementEnabled,
} from "@/lib/strata/subscription";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Resident Portal" };
export const instant = false;

export default async function PortalPage() {
  await connection();
  const context = await getStrataContext();
  if (!context) redirect("/login");
  if (!context.activeMembership) redirect("/setup");

  const strata = context.activeMembership;
  if (isBillingEnforcementEnabled()) {
    const subscription = await getWorkspaceSubscriptionState(strata.id).catch(() => null);
    if (!subscription?.workspaceAccess) {
      if (strata.role === "admin") {
        redirect("/billing?reason=subscription_required");
      }
      return (
        <main className="flex min-h-screen items-center justify-center px-4 py-12">
          <section className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
            <h1 className="font-serif text-2xl text-navy-950">This workspace is not active yet</h1>
            <p className="mt-3 text-sm leading-6 text-ink-500">
              Your strata administrator needs to start the 1-month free trial or subscription before the resident portal is available.
            </p>
            <form action={signOut} className="mt-6">
              <button type="submit" className="text-sm font-semibold text-ink-700 underline underline-offset-4">
                Sign out
              </button>
            </form>
          </section>
        </main>
      );
    }
  }

  const supabase = await createSupabaseServerClient();
  const [ticketsResult, assetsResult, minutesResult, noticesResult] = await Promise.all([
    supabase
      .from("maintenance_tickets")
      .select("id, title, location, urgency, status, created_at")
      .eq("strata_id", strata.id)
      .eq("submitted_by", context.userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("parking_assets")
      .select("id, unit_number, stall_number, asset_type")
      .eq("strata_id", strata.id)
      .eq("assigned_to", context.userId)
      .order("unit_number", { ascending: true })
      .limit(100),
    supabase
      .from("meeting_minutes")
      .select("id, meeting_date, meeting_type, formatted_content")
      .eq("strata_id", strata.id)
      .eq("status", "published")
      .order("meeting_date", { ascending: false })
      .limit(25),
    supabase
      .from("strata_notices")
      .select("id, title, body, severity, created_at")
      .eq("strata_id", strata.id)
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  if (ticketsResult.error || assetsResult.error || minutesResult.error) {
    throw new Error("Unable to load resident requests and assigned assets. Confirm Phase 2 migrations are applied.");
  }

  return (
    <ResidentPortal
      strataId={strata.id}
      strataName={strata.name}
      tickets={ticketsResult.data ?? []}
      parkingAssets={assetsResult.data ?? []}
      publishedMinutes={minutesResult.data ?? []}
      notices={noticesResult.error ? [] : noticesResult.data ?? []}
    />
  );
}
