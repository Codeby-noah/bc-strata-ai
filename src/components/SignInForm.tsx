"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type SignInState } from "@/lib/auth/actions";

const initialState: SignInState = {};

export function SignInForm() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-semibold text-ink-900"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-pine-700 focus:ring-2 focus:ring-pine-700/20"
        />
      </div>
      <label className="flex items-start gap-2.5 text-sm leading-5 text-ink-700">
        <input
          type="checkbox"
          name="legal_consent"
          required
          className="mt-1 h-4 w-4 shrink-0 accent-pine-700"
        />
        <span>
          I agree to the{" "}
          <Link
            href="/terms"
            target="_blank"
            className="font-semibold underline underline-offset-2"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            target="_blank"
            className="font-semibold underline underline-offset-2"
          >
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-semibold text-ink-900"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={1024}
          className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-pine-700 focus:ring-2 focus:ring-pine-700/20"
        />
      </div>
      {state.error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-pine-700 px-4 py-3 text-sm font-semibold text-white hover:bg-pine-600 disabled:cursor-wait disabled:opacity-70"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
