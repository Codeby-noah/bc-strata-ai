import type { Metadata } from "next";
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

export default async function SettingsPage() {
  const context = await getStrataContext();
  const strata = context?.activeMembership;
  if (!strata) return null;

  const supabase = await createSupabaseServerClient();
  const { data: workspace, error: workspaceError } = await supabase
    .from("strata_corporations")
    .select("id, name, strata_number")
    .eq("id", strata.id)
    .maybeSingle();
  if (workspaceError || !workspace) {
    throw new Error("Unable to load workspace settings.");
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
        subscriptionStatus="Launch Special ($119/mo)"
      />
    </div>
  );
}
