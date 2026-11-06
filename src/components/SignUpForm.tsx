"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type SignUpState } from "@/lib/auth/actions";

const initialState: SignUpState = {};

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label
          htmlFor="signup-email"
          className="mb-1.5 block text-sm font-semibold text-ink-900"
        >
          Email
        </label>
        <input
          id="signup-email"
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
          htmlFor="signup-password"
          className="mb-1.5 block text-sm font-semibold text-ink-900"
        >
          Create password
        </label>
        <input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={1024}
          required
          aria-describedby="password-hint"
          className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-pine-700 focus:ring-2 focus:ring-pine-700/20"
        />
        <p id="password-hint" className="mt-1.5 text-xs text-ink-500">
          Use at least 12 characters. Don’t reuse your email password.
        </p>
      </div>
      {state.error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p
          className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900"
          role="status"
        >
          {state.success}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-pine-700 px-4 py-3 text-sm font-semibold text-white hover:bg-pine-600 disabled:cursor-wait disabled:opacity-70"
      >
        {isPending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-pine-800 underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
