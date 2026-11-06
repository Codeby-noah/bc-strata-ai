"use client";

import { useState } from "react";
import Link from "next/link";
import { ResidentMagicLinkForm } from "@/components/ResidentMagicLinkForm";
import { SignInForm } from "@/components/SignInForm";

type LoginMode = "council" | "resident";

export function LoginTabs() {
  const [mode, setMode] = useState<LoginMode>("council");

  return (
    <>
      <div
        role="tablist"
        aria-label="Choose sign-in method"
        className="mt-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1"
      >
        <button
          type="button"
          role="tab"
          id="council-tab"
          aria-selected={mode === "council"}
          aria-controls="council-panel"
          onClick={() => setMode("council")}
          className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
            mode === "council"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Council Member
        </button>
        <button
          type="button"
          role="tab"
          id="resident-tab"
          aria-selected={mode === "resident"}
          aria-controls="resident-panel"
          onClick={() => setMode("resident")}
          className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
            mode === "resident"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Resident
        </button>
      </div>
      {mode === "council" ? (
        <div id="council-panel" role="tabpanel" aria-labelledby="council-tab">
          <SignInForm />
          <p className="mt-5 text-center text-sm text-ink-500">
            New here?{" "}
            <Link
              href="/signup"
              className="font-semibold text-pine-800 underline underline-offset-4"
            >
              Create an account
            </Link>
          </p>
        </div>
      ) : (
        <div id="resident-panel" role="tabpanel" aria-labelledby="resident-tab">
          <ResidentMagicLinkForm />
        </div>
      )}
    </>
  );
}
