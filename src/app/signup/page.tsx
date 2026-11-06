import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/SignUpForm";
import { LoadingScreen } from "@/components/LoadingScreen";
import { getStrataContext } from "@/lib/strata/context";

export const metadata: Metadata = {
  title: "Create account",
};

export const instant = false;

export default function SignUpPage() {
  return (
    <Suspense
      fallback={<LoadingScreen message="Loading account setup…" />}
    >
      <SignUpPanel />
    </Suspense>
  );
}

async function SignUpPanel() {
  const context = await getStrataContext();
  if (context) {
    redirect("/dashboard");
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
        <Link
          href="/login"
          className="text-xs font-semibold uppercase tracking-[0.18em] text-pine-700"
        >
          BC Strata
        </Link>
        <h1 className="mt-3 font-serif text-3xl tracking-tight text-navy-950">
          Create your account
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-500">
          Sign up with your email to get started. You can create a private
          strata workspace and become its first administrator, or have an
          administrator add you to an existing workspace.
        </p>
        <SignUpForm />
        <p className="mt-6 border-t border-stone-100 pt-5 text-xs leading-5 text-ink-500">
          After signing in, set up your strata workspace or ask your existing
          administrator to grant access.
        </p>
        </section>
      </div>
    </main>
  );
}
