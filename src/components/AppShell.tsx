"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { signOut, switchActiveStrata } from "@/lib/auth/actions";

type TenantOption = {
  id: string;
  name: string;
  strataNumber: string;
  city: string | null;
};

export function AppShell({
  children,
  email,
  tenants,
  activeTenantId,
  activeRole,
}: {
  children: React.ReactNode;
  email: string;
  tenants: TenantOption[];
  activeTenantId: string;
  activeRole: string;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);

  return (
    <div className="min-h-screen bg-zinc-50 lg:grid lg:grid-cols-[16rem_1fr]">
      <Sidebar
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        role={activeRole}
      />
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md lg:px-8">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <MenuIcon />
            Menu
          </button>
          <p className="hidden text-sm text-ink-500 lg:block">
            Self-managed strata operations · British Columbia
          </p>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold capitalize text-slate-700 md:inline-flex">
              {activeRole === "member" ? "Resident / member" : activeRole}
            </span>
            <form action={switchActiveStrata} className="hidden items-center gap-2 sm:flex">
              <label htmlFor="active-strata" className="sr-only">
                Active strata
              </label>
              <select
                id="active-strata"
                name="strataId"
                defaultValue={activeTenantId}
                className="max-w-56 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} · LMS {tenant.strataNumber}
                  </option>
                ))}
              </select>
              {tenants.length > 1 ? (
                <button
                  type="submit"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Switch
                </button>
              ) : null}
            </form>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              {email.slice(0, 1).toUpperCase() || "U"}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>
        {activeTenant ? (
          <div className="border-b border-gray-200 bg-white px-4 py-2 text-xs text-slate-500 sm:hidden">
            {activeTenant.name} · LMS {activeTenant.strataNumber}
          </div>
        ) : null}
        <main className="flex-1 px-4 py-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M3 5.5h14M3 10h14M3 14.5h14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
