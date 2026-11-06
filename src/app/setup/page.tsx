import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateWorkspaceForm } from "@/components/CreateWorkspaceForm";
import { getStrataContext } from "@/lib/strata/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Set up your strata",
};

export const instant = false;

export default async function SetupPage() {
  const context = await getStrataContext();
  if (!context) {
    redirect("/login");
  }
  if (context.activeMembership) {
    redirect("/dashboard");
  }

  const supabase = await createSupabaseServerClient();
  const { data: onboardingReady, error: onboardingError } = await supabase.rpc(
    "strata_onboarding_is_ready",
  );
  const databaseReady =
    context.membershipAccessStatus === "ready" &&
    !onboardingError &&
    onboardingReady === true;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
        <Link
          href="/dashboard"
          className="text-xs font-semibold uppercase tracking-[0.18em] text-pine-700"
        >
          BC Strata
        </Link>
        <h1 className="mt-3 font-serif text-3xl tracking-tight text-navy-950">
          Set up your strata workspace
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-500">
          Register your strata corporation to create a private workspace. Your
          signed-in account will become its first administrator.
        </p>
        {databaseReady ? (
          <CreateWorkspaceForm />
        ) : (
          <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Workspace setup is not available until the latest database
            migration is installed. No workspace has been created.
          </p>
        )}
        <p className="mt-6 text-center text-sm text-ink-500">
          Already have access?{" "}
          <Link href="/dashboard" className="font-semibold text-pine-800 underline">
            Open your workspace
          </Link>
        </p>
      </section>
    </main>
  );
}
