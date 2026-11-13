import { NextResponse } from "next/server";
import { getStrataContext } from "@/lib/strata/context";
import { paidWorkspaceResponse } from "@/lib/strata/subscription";
import { canManageMembers, type StrataRole } from "@/lib/strata/roles";
import { getSiteUrl } from "@/lib/site-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
    return NextResponse.json({ error: "Sign in to invite members." }, { status: 401 });
  }
  if (!canManageMembers(context.activeMembership.role)) {
    return NextResponse.json(
      { error: "Administrator access is required." },
      { status: 403 },
    );
  }
  const subscription = await paidWorkspaceResponse(context.activeMembership.id);
  if (subscription) return subscription;

  const body: unknown = await request.json().catch(() => null);
  if (
    !isRecord(body) ||
    typeof body.email !== "string" ||
    body.email.trim().length < 3 ||
    body.email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
  ) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const role =
    typeof body.role === "string" && validRoles.has(body.role as StrataRole)
      ? (body.role as StrataRole)
      : "member";
  const email = body.email.trim().toLowerCase();
  const strataId = context.activeMembership.id;

  if (email === context.email.toLowerCase()) {
    return NextResponse.json(
      { error: "You cannot invite your own account." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient({ writeCookies: true });
  const { error: existingMemberError } = await supabase.rpc(
    "add_strata_member_by_email",
    {
      target_strata_id: strataId,
      member_email: email,
      member_role: role,
    },
  );

  if (!existingMemberError) {
    return NextResponse.json(
      {
        saved: true,
        mode: "existing_user",
        message:
          "That person already has an account. Workspace access was granted — they can sign in with their existing password or magic link.",
      },
      { status: 201 },
    );
  }

  if (
    !existingMemberError.message.includes("No registered account was found for this email")
  ) {
    const message = existingMemberError.message.includes("already")
      ? "That email already has access to this workspace."
      : "The invitation could not be created. Try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      {
        error:
          "Email invitations require server-side Supabase service role configuration.",
      },
      { status: 503 },
    );
  }

  const siteUrl = getSiteUrl();
  if (!siteUrl) {
    return NextResponse.json(
      { error: "Set NEXT_PUBLIC_SITE_URL before sending invitations." },
      { status: 503 },
    );
  }

  const redirectTo = new URL("/auth/callback", siteUrl);
  redirectTo.searchParams.set("next", role === "member" ? "/portal" : "/dashboard");

  const { error: queueError } = await admin.from("strata_pending_invites").upsert(
    {
      strata_id: strataId,
      email,
      role,
      invited_by: context.userId,
    },
    { onConflict: "strata_id,email" },
  );
  if (queueError) {
    return NextResponse.json(
      {
        error:
          "Invitation queue is not ready. Apply the latest Supabase migrations first.",
      },
      { status: 503 },
    );
  }

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectTo.toString(),
    data: {
      invited_strata_id: strataId,
      invited_role: role,
    },
  });

  if (inviteError) {
    await admin
      .from("strata_pending_invites")
      .delete()
      .eq("strata_id", strataId)
      .eq("email", email);

    return NextResponse.json(
      {
        error:
          inviteError.message.includes("already been registered") ||
          inviteError.message.includes("already registered")
            ? "That email is already registered. Add them from Members & access instead."
            : "Supabase could not send the invitation email. Check Auth email settings.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      saved: true,
      mode: "invited",
      message: `Invitation sent to ${email}. They will receive a secure link to join this workspace.`,
    },
    { status: 201 },
  );
}
