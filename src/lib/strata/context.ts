import "server-only";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getMembershipAccessStatus,
  type MembershipAccessStatus,
} from "@/lib/strata/membership-status";
import type { StrataRole } from "@/lib/strata/roles";

export type StrataMembership = {
  id: string;
  name: string;
  strataNumber: string;
  city: string | null;
  role: StrataRole;
};

export type StrataContext = {
  userId: string;
  email: string;
  memberships: StrataMembership[];
  activeMembership: StrataMembership | null;
  membershipAccessStatus: MembershipAccessStatus;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseMemberships(value: unknown): StrataMembership[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const memberships: StrataMembership[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    const strataValue = item.strata_corporations;
    const strata = Array.isArray(strataValue) ? strataValue[0] : strataValue;
    if (
      typeof item.strata_id !== "string" ||
      typeof item.role !== "string" ||
      !["admin", "council", "treasurer", "member", "auditor"].includes(item.role) ||
      !isRecord(strata) ||
      typeof strata.name !== "string" ||
      typeof strata.strata_number !== "string"
    ) {
      continue;
    }

    memberships.push({
      id: item.strata_id,
      role: item.role as StrataRole,
      name: strata.name,
      strataNumber: strata.strata_number,
      city: typeof strata.city === "string" ? strata.city : null,
    });
  }
  return memberships;
}

export async function getStrataContext(): Promise<StrataContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError && userError.name !== "AuthSessionMissingError") {
    throw new Error("Unable to verify your sign-in. Please sign in again.");
  }
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("strata_memberships")
    .select(
      "strata_id, role, strata_corporations!inner(name, strata_number, city)",
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  const membershipAccessStatus = getMembershipAccessStatus(error);
  const memberships = error ? [] : parseMemberships(data);
  const cookieStore = await cookies();
  const selectedId = cookieStore.get("bc-strata-active-id")?.value;
  const activeMembership =
    memberships.find((membership) => membership.id === selectedId) ??
    memberships[0] ??
    null;

  return {
    userId: user.id,
    email: user.email ?? "",
    memberships,
    activeMembership,
    membershipAccessStatus,
  };
}
