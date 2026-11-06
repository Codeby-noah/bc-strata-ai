"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getStrataContext } from "@/lib/strata/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CreateWorkspaceState = {
  error?: string;
};

export async function createWorkspace(
  _previousState: CreateWorkspaceState,
  formData: FormData,
): Promise<CreateWorkspaceState> {
  const strataNumber = formData.get("strata-number");
  const name = formData.get("name");
  const city = formData.get("city");

  if (
    typeof strataNumber !== "string" ||
    strataNumber.trim().length < 1 ||
    strataNumber.trim().length > 30 ||
    typeof name !== "string" ||
    name.trim().length < 1 ||
    name.trim().length > 120 ||
    typeof city !== "string" ||
    city.trim().length > 100
  ) {
    return {
      error: "Enter a strata number, corporation name, and a city up to 100 characters.",
    };
  }

  const context = await getStrataContext();
  if (!context) {
    redirect("/login");
  }
  if (context.membershipAccessStatus !== "ready") {
    return {
      error: "Workspace setup is unavailable until the database setup is complete.",
    };
  }
  if (context.activeMembership) {
    redirect("/dashboard");
  }

  const supabase = await createSupabaseServerClient({ writeCookies: true });
  const { data: strataId, error } = await supabase.rpc(
    "create_strata_workspace",
    {
      p_strata_number: strataNumber.trim(),
      p_name: name.trim(),
      p_city: city.trim() || null,
    },
  );

  if (error || typeof strataId !== "string") {
    return {
      error:
        "The workspace could not be created. Check that the strata number is correct and not already registered.",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set("bc-strata-active-id", strataId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/dashboard");
}
