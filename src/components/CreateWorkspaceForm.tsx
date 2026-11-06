"use client";

import { useActionState } from "react";
import { createWorkspace, type CreateWorkspaceState } from "@/lib/strata/actions";

const initialState: CreateWorkspaceState = {};
const inputClass =
  "mt-1.5 h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-pine-700 focus:ring-2 focus:ring-pine-700/20";

export function CreateWorkspaceForm() {
  const [state, formAction, isPending] = useActionState(
    createWorkspace,
    initialState,
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <label className="block text-sm font-medium text-ink-700">
        Strata plan number
        <input
          name="strata-number"
          required
          maxLength={30}
          autoComplete="off"
          className={inputClass}
          placeholder="For example, LMS 1234"
        />
      </label>
      <label className="block text-sm font-medium text-ink-700">
        Strata corporation name
        <input
          name="name"
          required
          maxLength={120}
          autoComplete="organization"
          className={inputClass}
        />
      </label>
      <label className="block text-sm font-medium text-ink-700">
        City
        <input
          name="city"
          maxLength={100}
          autoComplete="address-level2"
          className={inputClass}
        />
      </label>
      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      <p className="text-xs leading-5 text-ink-500">
        Creating the workspace makes your signed-in account its first
        administrator. You can then add other registered users with limited
        roles.
      </p>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-pine-700 px-4 py-3 text-sm font-semibold text-white hover:bg-pine-600 disabled:cursor-wait disabled:opacity-70"
      >
        {isPending ? "Creating workspace…" : "Create strata workspace"}
      </button>
    </form>
  );
}
