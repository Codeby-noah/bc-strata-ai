import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { LoadingScreen } from "@/components/LoadingScreen";
import { signOut } from "@/lib/auth/actions";
import { getStrataContext } from "@/lib/strata/context";
import Link from "next/link";

export const instant = false;

export default async function StrataAppLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <Suspense
      fallback={<LoadingScreen message="Loading your strata workspace…" />}
    >
      <AuthenticatedStrataApp>{children}</AuthenticatedStrataApp>
    </Suspense>
  );
}

async function AuthenticatedStrataApp({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const context = await getStrataContext();
  if (!context) {
    redirect("/login");
  }

  if (context.membershipAccessStatus !== "ready" || !context.activeMembership) {
    const schemaNotReady =
      context.membershipAccessStatus === "schema_not_ready";

    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <section className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine-700">
            BC Strata
          </p>
          <h1 className="mt-3 font-serif text-2xl text-navy-950">
            {schemaNotReady
              ? "Workspace setup is not finished"
              : context.membershipAccessStatus === "temporarily_unavailable"
                ? "We couldn’t load your workspace access"
                : "Your account is waiting for strata access"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-500">
            {schemaNotReady
              ? "Your sign-in worked, but the strata workspace database is not ready yet. The project owner needs to complete the database setup before anyone can use the workspace."
              : context.membershipAccessStatus === "temporarily_unavailable"
                ? "Your sign-in worked, but we couldn’t safely check your strata access. Please try again later or contact the project owner."
                : "You are signed in, but this account does not yet have a strata workspace. Create one or ask an administrator to add you to an existing one."}
          </p>
          <div className="mt-6 flex items-center gap-4">
            {!schemaNotReady &&
            context.membershipAccessStatus === "ready" ? (
              <Link
                href="/setup"
                className="rounded-lg bg-pine-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-600"
              >
                Set up a strata workspace
              </Link>
            ) : null}
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm font-semibold text-ink-700 underline underline-offset-4"
              >
                Sign out
              </button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  return (
    <AppShell
      email={context.email}
      tenants={context.memberships}
      activeTenantId={context.activeMembership.id}
      activeRole={context.activeMembership.role}
    >
      {children}
    </AppShell>
  );
}
