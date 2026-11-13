"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

const navGroups: Array<{
  label: string;
  items: Array<{
    href: string;
    label: string;
    icon: ComponentType;
    adminOnly?: boolean;
  }>;
}> = [
  {
    label: "Council hub",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
      { href: "/documents", label: "Documents & rulebook", icon: VaultIcon },
      { href: "/ledgers", label: "Financial ledgers", icon: LedgerIcon },
      { href: "/forms", label: "Form B/F records", icon: FormIcon },
      { href: "/minutes", label: "Meeting minutes", icon: MinutesIcon },
    ],
  },
  {
    label: "Resident services",
    items: [
      { href: "/maintenance", label: "Maintenance requests", icon: MaintenanceIcon },
      { href: "/amenities", label: "Amenity bookings", icon: AmenityIcon },
      { href: "/parking", label: "Visitor parking", icon: ParkingIcon },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/governance/voting", label: "Council voting", icon: VoteIcon },
      { href: "/governance/compliance", label: "Compliance & warranties", icon: ComplianceIcon },
      { href: "/members", label: "Members & access", icon: MembersIcon, adminOnly: true },
      { href: "/settings", label: "Workspace settings", icon: SettingsIcon },
      { href: "/billing", label: "Subscription billing", icon: BillingIcon, adminOnly: true },
    ],
  },
];

type SidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
  role: string;
};

export function Sidebar({ mobileOpen, onClose, role }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-sm transition-opacity lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-zinc-50/80 text-slate-800 shadow-sm backdrop-blur-md transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-gray-200 px-6 py-6">
          <Link href="/dashboard" className="block" onClick={onClose}>
            <p className="text-xl font-semibold tracking-tight text-slate-900">
              StrataDock
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-slate-400">
              Compliance · Stewardship
            </p>
          </Link>
        </div>
        <nav
          className="flex-1 space-y-6 overflow-y-auto px-3 py-5"
          aria-label="Primary"
        >
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.adminOnly || role === "admin",
            );
            if (!visibleItems.length) {
              return null;
            }

            return (
              <section key={group.label}>
                <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {group.label}
                </h2>
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm leading-snug transition-colors ${
                          active
                            ? "bg-slate-100 font-medium text-slate-900"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon />
                        <span className="pt-0.5">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </nav>
        <div className="border-t border-gray-200 px-6 py-5 text-xs text-slate-500">
          <p className="font-medium text-slate-700">Built for BC strata</p>
          <p className="mt-1">Practical tools for council operations. Not legal advice.</p>
        </div>
      </aside>
    </>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden>
      <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="2.5" width="6.5" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="8.5" width="6.5" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function VaultIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden>
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5V16H4V5.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M4 8h12M8 4v4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function LedgerIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden>
      <path
        d="M4 4.5h12v11H4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M7 8h6M7 11h6M7 14h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function FormIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden>
      <path
        d="M6 3.5h6.2L16 7.3V16.5H6V3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 3.5V7.5h4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.5 11h5M8.5 13.5h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MinutesIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden>
      <path
        d="M5 3.5h7l3 3v10H5v-13Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 3.5v3h3M7.5 9h5M7.5 12h5M7.5 15h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function MaintenanceIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden>
      <path d="M11.5 3.5a4 4 0 0 0-5.3 5.3l-3.1 3.1a1.8 1.8 0 0 0 2.5 2.5l3.1-3.1a4 4 0 0 0 5.3-5.3l-2.4 2.4-2.5-2.5 2.4-2.4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function AmenityIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden>
      <rect x="3" y="4.5" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 3v3M13.5 3v3M3 8h14M6.5 11h2M11.5 11h2M6.5 14h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ParkingIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 14V6h3a2 2 0 0 1 0 4H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VoteIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden>
      <path d="m4 10 3.5 3.5L16 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.5 10v5.5h-13v-11H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ComplianceIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden>
      <path d="M10 2.5 16 5v4.5c0 3.7-2.5 6.5-6 8-3.5-1.5-6-4.3-6-8V5l6-2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m7.5 9.5 1.7 1.7 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MembersIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden>
      <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 16c.4-2.6 2-4 4.5-4s4.1 1.4 4.5 4M13 5.5a2.5 2.5 0 0 1 0 4.8M13.5 12c2.2.3 3.5 1.6 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BillingIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden>
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8h14M6 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden>
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2.5v2M10 15.5v2M3.5 10h2M14.5 10h2M5.2 5.2l1.4 1.4M13.4 13.4l1.4 1.4M5.2 14.8l1.4-1.4M13.4 6.6l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
