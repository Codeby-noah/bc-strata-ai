import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import {
  MinutesWorkspace,
  type MeetingRecord,
} from "@/components/MinutesWorkspace";
import { canManageExemptions } from "@/lib/strata/roles";
import { getStrataContext } from "@/lib/strata/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Meeting Minutes" };
export const instant = false;

export default async function MinutesPage() {
  const context = await getStrataContext();
  const strata = context?.activeMembership;
  if (!strata) return null;

  if (!canManageExemptions(strata.role)) {
    return (
      <div>
        <PageHeader
          eyebrow="Governance"
          title="Meeting Minutes"
          description="Prepare, review, and publish meeting records for your strata."
        />
        <p className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Council access is required to draft or edit meeting minutes.
        </p>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("meeting_minutes")
    .select("id, meeting_date, meeting_type, raw_notes, formatted_content, status, created_at")
    .eq("strata_id", strata.id)
    .order("meeting_date", { ascending: false })
    .limit(50);
  if (error) {
    throw new Error("Unable to load meeting minutes. Confirm the Phase 2 migration is applied.");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Governance"
        title="Meeting Minutes"
        description="Turn shorthand notes into a structured, reviewable record. Confirm names, motions, facts, and times before publishing."
      />
      <MinutesWorkspace initialRecords={(data ?? []) as MeetingRecord[]} />
    </div>
  );
}
