"use client";

import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function ResidentMagicLinkForm() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function sendLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      toast.error("Enter your email address.");
      return;
    }

    setSending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectUrl = new URL("/auth/callback?next=%2Fportal", window.location.origin).toString();
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: false,
        },
      });
      if (error) {
        toast.error("Failed to send link. Check your email and try again.");
        return;
      }

      setSentTo(normalizedEmail);
      toast.success("Secure sign-in link sent.");
    } catch {
      toast.error("Failed to send link. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  if (sentTo) {
    return (
      <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-7 text-center">
        <MailCheck className="mx-auto h-10 w-10 text-emerald-600" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Check your email!
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          A secure login link has been sent to{" "}
          <span className="font-semibold text-slate-800">{sentTo}</span>.
        </p>
        <button
          type="button"
          onClick={() => setSentTo(null)}
          className="mt-5 text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void sendLink(event)} className="mt-8 space-y-5">
      <div>
        <label
          htmlFor="resident-email"
          className="mb-1.5 block text-sm font-semibold text-slate-800"
        >
          Email
        </label>
        <input
          id="resident-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={sending}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
        />
      </div>
      <button
        type="submit"
        disabled={sending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
      >
        {sending ? <LoadingSpinner /> : null}
        {sending ? "Sending…" : "Send Login Link"}
      </button>
      <p className="text-center text-xs leading-5 text-slate-500">
        No password needed. We’ll email you a secure link to sign in instantly.
      </p>
      <p className="text-center text-xs leading-5 text-slate-500">
        By requesting a link, you agree to our{" "}
        <Link href="/terms" className="font-medium underline underline-offset-2">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-medium underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
