import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResidentPortal } from "@/components/ResidentPortal";
import { getStrataContext } from "@/lib/strata/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Resident Portal" };
export const instant = false;

export default async function PortalPage() {
  const context = await getStrataContext();
  if (!context) redirect("/login");
  if (!context.activeMembership) redirect("/setup");

  const strata = context.activeMembership;
  const supabase = await createSupabaseServerClient();
  const [ticketsResult, assetsResult, minutesResult] = await Promise.all([
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
    />
  );
}
