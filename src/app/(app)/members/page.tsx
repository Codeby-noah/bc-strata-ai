import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { MemberManagement } from "@/components/MemberManagement";
import { PageHeader } from "@/components/PageHeader";
import { canManageMembers } from "@/lib/strata/roles";
import { getStrataContext } from "@/lib/strata/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Members & access",
};
export const instant = false;

export default async function MembersPage() {
  await connection();
  const context = await getStrataContext();
  const strata = context?.activeMembership;
  if (!strata) {
    return null;
  }
  if (!canManageMembers(strata.role)) {
    redirect("/dashboard");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_strata_members", {
    target_strata_id: strata.id,
  });
  if (error) {
    throw new Error("Unable to load workspace members.");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Members & access"
        description="Give registered users only the access they need. Each person's role is enforced by database policies as well as the app."
      />
      <MemberManagement members={data ?? []} currentUserId={context.userId} />
    </div>
  );
}
