import { NextResponse } from "next/server";
import { getStrataContext } from "@/lib/strata/context";
import { paidWorkspaceResponse } from "@/lib/strata/subscription";
import { canManageExemptions } from "@/lib/strata/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const context = await getStrataContext();
  if (!context) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  const strata = context.activeMembership;
  if (!strata || !canManageExemptions(strata.role)) {
    return NextResponse.json({ error: "Council access is required." }, { status: 403 });
  }
  const subscription = await paidWorkspaceResponse(strata.id);
  if (subscription) return subscription;

  const body: unknown = await request.json().catch(() => null);
  if (
    !isRecord(body) ||
    typeof body.requested_by !== "string" ||
    body.requested_by.trim().length < 1 ||
    body.requested_by.trim().length > 160 ||
    typeof body.unit_number !== "string" ||
    body.unit_number.trim().length < 1 ||
    body.unit_number.trim().length > 40 ||
    !["Form B", "Form F"].includes(String(body.form_type))
  ) {
    return NextResponse.json(
      { error: "Enter the requester, unit number, and Form B or Form F." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("form_requests")
    .insert({
      strata_id: strata.id,
      requested_by: body.requested_by.trim(),
      unit_number: body.unit_number.trim(),
      form_type: body.form_type,
      status: "pending_payment",
    })
    .select("id, requested_by, unit_number, form_type, status, amount_due, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "The Form B/F request could not be saved." },
      { status: 500 },
    );
  }
  return NextResponse.json({ request: data }, { status: 201 });
}
