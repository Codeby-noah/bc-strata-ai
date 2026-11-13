import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/PageHeader";
import {
  FormRequestsWorkspace,
  type FormRequestRow,
} from "@/components/FormRequestsWorkspace";
import { canManageExemptions } from "@/lib/strata/roles";
import { getStrataContext } from "@/lib/strata/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Form B/F Requests" };
export const instant = false;

export default async function FormsPage() {
  await connection();
  const context = await getStrataContext();
  const strata = context?.activeMembership;
  if (!strata) return null;

  if (!canManageExemptions(strata.role)) {
    return (
      <div>
        <PageHeader
          eyebrow="Council filings"
          title="Form B/F Requests"
          description="Council members can review and prepare Form B and Form F request previews."
        />
        <p className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Council access is required to view form request details.
        </p>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("form_requests")
    .select("id, requested_by, unit_number, form_type, status, amount_due, created_at")
    .eq("strata_id", strata.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    throw new Error("Unable to load Form B/F requests. Confirm the Phase 2 migration is applied.");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Council filings"
        title="Form B/F Requests"
        description="Review requests and prepare a workspace-backed draft preview. Payment processing, statutory certification, and official PDF issuance are not enabled."
      />
      <FormRequestsWorkspace requests={(data ?? []) as FormRequestRow[]} />
    </div>
  );
}
