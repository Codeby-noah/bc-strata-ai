import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/PageHeader";
import { SettingsWorkspace } from "@/components/SettingsWorkspace";
import { canManageMembers } from "@/lib/strata/roles";
import { getStrataContext } from "@/lib/strata/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Workspace settings" };
export const instant = false;

type WorkspaceMember = {
  user_id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

const portalNotices: Record<string, string> = {
  returned: "You returned from the Stripe billing portal.",
  forbidden: "Only a strata administrator can open billing management.",
  unconfigured: "Billing is not configured. Add the Stripe secret key and site URL.",
  unavailable: "Billing records could not be loaded. Apply the billing migration first.",
  error:
    "Stripe could not open the customer portal. Confirm the Customer Portal is enabled in the Stripe dashboard.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ portal?: string | string[] }>;
}) {
  await connection();
  const context = await getStrataContext();
  const strata = context?.activeMembership;
  if (!strata) return null;

  const params = await searchParams;
  const portalKey = typeof params.portal === "string" ? params.portal : "";
  const portalNotice = portalNotices[portalKey] ?? null;

  const supabase = await createSupabaseServerClient();
  const { data: workspace, error: workspaceError } = await supabase
    .from("strata_corporations")
    .select("id, name, strata_number")
    .eq("id", strata.id)
    .maybeSingle();
  if (workspaceError || !workspace) {
    throw new Error("Unable to load workspace settings.");
  }

  let subscriptionStatus = "Not subscribed";
  let canOpenPortal = false;
  if (canManageMembers(strata.role)) {
    const { data: billing } = await supabase
      .from("strata_billing")
      .select("subscription_status, stripe_customer_id")
      .eq("strata_id", strata.id)
      .maybeSingle();
    if (billing?.subscription_status) {
      subscriptionStatus = `StrataDock · ${billing.subscription_status} · $139 CAD/mo for 12 months, then $179`;
    }
    canOpenPortal =
      typeof billing?.stripe_customer_id === "string" &&
      billing.stripe_customer_id.length > 0;
  }

  let members: WorkspaceMember[] = [];
  if (canManageMembers(strata.role)) {
    const { data, error } = await supabase.rpc("list_strata_members", {
      target_strata_id: strata.id,
    });
    if (error) throw new Error("Unable to load workspace members.");
    members = (data ?? []) as WorkspaceMember[];
  }

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Manage workspace details, see who has access, and review your plan."
      />
      <SettingsWorkspace
        workspace={{
          id: workspace.id,
          name: workspace.name,
          strataNumber: workspace.strata_number,
        }}
        members={members}
        canManage={canManageMembers(strata.role)}
        subscriptionStatus={subscriptionStatus}
        canOpenPortal={canOpenPortal}
        portalNotice={portalNotice}
      />
    </div>
  );
}
