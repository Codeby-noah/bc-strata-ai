import { NextResponse } from "next/server";
import { getStrataContext } from "@/lib/strata/context";
import { canManageMembers, type StrataRole } from "@/lib/strata/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const validRoles = new Set<StrataRole>([
  "admin",
  "council",
  "treasurer",
  "member",
  "auditor",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const context = await getStrataContext();
  if (!context?.activeMembership) {
    return NextResponse.json({ error: "Sign in to manage members." }, { status: 401 });
  }
  if (!canManageMembers(context.activeMembership.role)) {
    return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (
    !isRecord(body) ||
    typeof body.email !== "string" ||
    body.email.trim().length < 3 ||
    body.email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ||
    typeof body.role !== "string" ||
    !validRoles.has(body.role as StrataRole)
  ) {
    return NextResponse.json(
      { error: "Enter a valid registered email and select a workspace role." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient({ writeCookies: true });
  const { error } = await supabase.rpc("add_strata_member_by_email", {
    target_strata_id: context.activeMembership.id,
    member_email: body.email.trim(),
    member_role: body.role,
  });
  if (error) {
    const message = error.message.includes("No registered account")
      ? "No registered account was found for that email. Ask them to sign up first."
      : error.message.includes("Administrator access")
        ? "Administrator access is required."
        : "The member could not be added. They may already have access.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ saved: true }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await getStrataContext();
  if (!context?.activeMembership) {
    return NextResponse.json({ error: "Sign in to manage members." }, { status: 401 });
  }
  if (!canManageMembers(context.activeMembership.role)) {
    return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (
    !isRecord(body) ||
    typeof body.userId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.userId) ||
    body.userId === context.userId ||
    !(
      (typeof body.role === "string" && validRoles.has(body.role as StrataRole)) ||
      body.status === "active" ||
      body.status === "disabled"
    )
  ) {
    return NextResponse.json({ error: "Choose a valid member and access change." }, { status: 400 });
  }

  const changes: { role?: StrataRole; status?: "active" | "disabled" } = {};
  if (typeof body.role === "string" && validRoles.has(body.role as StrataRole)) {
    changes.role = body.role as StrataRole;
  }
  if (body.status === "active" || body.status === "disabled") {
    changes.status = body.status;
  }

  const supabase = await createSupabaseServerClient({ writeCookies: true });
  const { data, error } = await supabase
    .from("strata_memberships")
    .update(changes)
    .eq("strata_id", context.activeMembership.id)
    .eq("user_id", body.userId)
    .select("user_id")
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json(
      { error: "The member access could not be updated." },
      { status: 400 },
    );
  }
  return NextResponse.json({ saved: true });
}
