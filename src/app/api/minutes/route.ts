import { NextResponse } from "next/server";
import { getStrataContext } from "@/lib/strata/context";
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

  const body: unknown = await request.json().catch(() => null);
  if (
    !isRecord(body) ||
    typeof body.meeting_date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.meeting_date) ||
    !["Council Meeting", "AGM", "SGM"].includes(String(body.meeting_type)) ||
    typeof body.raw_notes !== "string" ||
    body.raw_notes.length > 20000 ||
    typeof body.formatted_content !== "string" ||
    body.formatted_content.trim().length < 1 ||
    body.formatted_content.length > 50000 ||
    !["draft", "published"].includes(String(body.status))
  ) {
    return NextResponse.json({ error: "Complete the meeting details before saving." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const values = {
    strata_id: strata.id,
    meeting_date: body.meeting_date,
    meeting_type: body.meeting_type,
    raw_notes: body.raw_notes,
    formatted_content: body.formatted_content,
    status: body.status,
  };
  if (typeof body.id === "string") {
    const { data, error } = await supabase
      .from("meeting_minutes")
      .update(values)
      .eq("id", body.id)
      .eq("strata_id", strata.id)
      .select("id, status")
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: "Unable to update these minutes." }, { status: 500 });
    }
    return NextResponse.json({ id: data.id, status: data.status });
  }

  const { data, error } = await supabase
    .from("meeting_minutes")
    .insert({ ...values, created_by: context.userId })
    .select("id, status")
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "Unable to save these minutes." }, { status: 500 });
  }
  return NextResponse.json({ id: data.id, status: data.status }, { status: 201 });
}
