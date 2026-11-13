import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { login, signup } from "@/actions/auth";
import { ResidentMagicLinkForm } from "@/components/ResidentMagicLinkForm";
import { LoadingScreen } from "@/components/LoadingScreen";
import { getStrataContext } from "@/lib/strata/context";

export const metadata: Metadata = {
  title: "Sign in",
};

export const instant = false;

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; notice?: string; mode?: string }>;
}) {
  return (
    <Suspense fallback={<LoadingScreen message="Loading sign in…" />}>
      <LoginPanel searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginPanel({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; notice?: string; mode?: string }>;
}) {
  const context = await getStrataContext();
  if (context) {
    redirect(
      context.activeMembership?.role === "member" ? "/portal" : "/dashboard",
    );
  }

  const params = await searchParams;
  const message = typeof params.message === "string" ? params.message : "";
  const notice = typeof params.notice === "string" ? params.notice : "";
  const residentMode = params.mode === "resident";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-20">
      <main className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-8 py-12 sm:px-10 sm:py-14">
        <p className="text-sm font-semibold text-slate-950">
          <Link href="/" className="hover:text-slate-700">
            StrataDock
          </Link>
        </p>
        <h1 className="mt-10 text-3xl font-bold tracking-tight text-slate-950">
          Sign in to your workspace
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          {residentMode
            ? "Residents use an email link. No password is required."
            : "Use the email and password for your council account."}
        </p>

        {residentMode ? (
          <div className="mt-10">
            <ResidentMagicLinkForm />
          </div>
        ) : (
          <form className="mt-10 space-y-6">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-950">
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                required
                autoComplete="email"
                maxLength={254}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-950">
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                required
                autoComplete="current-password"
                minLength={1}
                maxLength={1024}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15"
              />
            </div>
            <label className="flex items-start gap-2.5 text-sm leading-6 text-slate-600">
              <input
                type="checkbox"
                name="legal_consent"
                required
                className="mt-1 h-4 w-4 shrink-0 accent-slate-900"
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="font-semibold text-slate-950 underline underline-offset-2">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="font-semibold text-slate-950 underline underline-offset-2">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            {notice ? (
              <p className="rounded-xl bg-emerald-50 px-3 py-3 text-sm leading-6 text-emerald-800" role="status">
                {notice}
              </p>
            ) : null}

            {message ? (
              <p className="rounded-xl bg-red-50 px-3 py-3 text-sm leading-6 text-red-700" role="alert">
                {message}
              </p>
            ) : null}

            <div className="space-y-3 pt-2">
              <button
                type="submit"
                formAction={login}
                className="h-12 w-full cursor-pointer rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 active:scale-95 active:shadow-none"
              >
                Sign in
              </button>
              <button
                type="submit"
                formAction={signup}
                className="h-12 w-full cursor-pointer rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-950 transition-all duration-200 hover:bg-slate-50 active:scale-95"
              >
                Create account
              </button>
            </div>
          </form>
        )}

        <p className="mt-8 text-sm text-slate-600">
          {residentMode ? (
            <Link href="/login" className="font-semibold text-slate-950 underline underline-offset-2">
              Council sign in
            </Link>
          ) : (
            <Link
              href="/login?mode=resident"
              className="font-semibold text-slate-950 underline underline-offset-2"
            >
              Resident sign-in link
            </Link>
          )}
        </p>
      </main>
    </div>
  );
}
