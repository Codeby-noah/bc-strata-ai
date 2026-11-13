import "server-only";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type WorkspaceSubscriptionState = {
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  workspaceAccess: boolean;
};

export function isBillingEnforcementEnabled() {
  return process.env.BILLING_ENFORCEMENT !== "off";
}

export async function getWorkspaceSubscriptionState(
  strataId: string,
): Promise<WorkspaceSubscriptionState | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_strata_subscription_state", {
    p_strata_id: strataId,
  });

  if (error) {
    if (
      error.message.includes("does not have access") ||
      error.message.includes("get_strata_subscription_state")
    ) {
      return {
        subscriptionStatus: "unknown",
        currentPeriodEnd: null,
        workspaceAccess: false,
      };
    }
    throw new Error("Unable to verify workspace subscription status.");
  }

  if (typeof data !== "object" || data === null) {
    return {
      subscriptionStatus: "pending",
      currentPeriodEnd: null,
      workspaceAccess: false,
    };
  }

  const record = data as Record<string, unknown>;
  const subscriptionStatus =
    typeof record.subscription_status === "string"
      ? record.subscription_status
      : "pending";
  const currentPeriodEnd =
    typeof record.current_period_end === "string"
      ? record.current_period_end
      : null;
  const workspaceAccess = record.workspace_access === true;

  return {
    subscriptionStatus,
    currentPeriodEnd,
    workspaceAccess,
  };
}

export async function paidWorkspaceDenial(
  strataId: string,
): Promise<{ error: string; status: number } | null> {
  if (!isBillingEnforcementEnabled()) return null;
  try {
    const state = await getWorkspaceSubscriptionState(strataId);
    if (state?.workspaceAccess) return null;
  } catch {
    return {
      error: "Unable to verify the workspace subscription.",
      status: 503,
    };
  }
  return {
    error: "Start the free trial or subscription before using this workspace.",
    status: 402,
  };
}

export async function paidWorkspaceResponse(strataId: string) {
  const denial = await paidWorkspaceDenial(strataId);
  if (!denial) return null;
  return NextResponse.json({ error: denial.error }, { status: denial.status });
}

export function subscriptionNotice(
  state: WorkspaceSubscriptionState,
): string | null {
  if (state.subscriptionStatus === "past_due") {
    return "Your subscription payment is past due. Ask your strata administrator to update billing to avoid interruption.";
  }
  return null;
}
