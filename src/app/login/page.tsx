import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginTabs } from "@/components/LoginTabs";
import { LoadingScreen } from "@/components/LoadingScreen";
import { getStrataContext } from "@/lib/strata/context";

export const metadata: Metadata = {
  title: "Sign in",
};

export const instant = false;

export default function LoginPage() {
  return (
    <Suspense
      fallback={<LoadingScreen message="Loading sign in…" />}
    >
      <LoginPanel />
    </Suspense>
  );
}

async function LoginPanel() {
  const context = await getStrataContext();
  if (context) {
    redirect(
      context.activeMembership?.role === "member" ? "/portal" : "/dashboard",
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <span aria-hidden>←</span>
          Back to Home
        </Link>
        <section className="w-full rounded-2xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine-700">
          BC Strata AI
        </p>
        <h1 className="mt-3 font-serif text-3xl tracking-tight text-navy-950">
          Sign in to your strata
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-500">
          Choose how you’d like to access your strata workspace.
        </p>
        <LoginTabs />
        </section>
      </div>
    </main>
  );
}
