"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ManageBillingButton } from "@/components/ManageBillingButton";

type SettingsTab = "general" | "team" | "billing";

type WorkspaceMember = {
  user_id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

export function SettingsWorkspace({
  workspace,
  members,
  canManage,
  subscriptionStatus,
  canOpenPortal,
  portalNotice,
}: {
  workspace: { id: string; name: string; strataNumber: string };
  members: WorkspaceMember[];
  canManage: boolean;
  subscriptionStatus: string;
  canOpenPortal: boolean;
  portalNotice?: string | null;
}) {
  const [tab, setTab] = useState<SettingsTab>("general");
  const [name, setName] = useState(workspace.name);
  const [strataNumber, setStrataNumber] = useState(workspace.strataNumber);
  const [saving, setSaving] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteBusy, setInviteBusy] = useState(false);

  async function sendInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteBusy(true);
    try {
      const response = await fetch("/api/strata/members/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        toast.error(result.error ?? "Invitation could not be sent.");
        return;
      }
      toast.success(result.message ?? "Invitation sent.");
      setInviteEmail("");
      setInviteOpen(false);
    } catch {
      toast.error("Invitation could not be sent. Check your connection.");
    } finally {
      setInviteBusy(false);
    }
  }

  async function saveGeneral(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/settings/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, strata_number: strataNumber }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(result.error ?? "Workspace settings could not be saved.");
        return;
      }
      toast.success("Workspace settings saved.");
    } catch {
      toast.error("Workspace settings could not be saved. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  const tabClass = (selected: boolean) =>
    `rounded-xl px-4 py-2.5 text-left text-sm font-medium transition ${
      selected
        ? "bg-white text-slate-900 shadow-sm ring-1 ring-gray-200"
        : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
    }`;

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav
          aria-label="Settings sections"
          className="flex gap-2 overflow-x-auto rounded-2xl border border-gray-200 bg-slate-100 p-2 lg:flex-col lg:self-start"
        >
          <button type="button" className={tabClass(tab === "general")} onClick={() => setTab("general")}>
            General
          </button>
          <button type="button" className={tabClass(tab === "team")} onClick={() => setTab("team")}>
            Team
          </button>
          <button type="button" className={tabClass(tab === "billing")} onClick={() => setTab("billing")}>
            Billing
          </button>
        </nav>

        <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          {tab === "general" ? (
            <div>
              <h2 className="text-lg font-semibold text-slate-900">General</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Keep the workspace identity aligned with your strata records.
              </p>
              <form onSubmit={(event) => void saveGeneral(event)} className="mt-6 max-w-xl space-y-5">
                <label className="block text-sm font-medium text-slate-700">
                  Complex name
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    maxLength={160}
                    disabled={!canManage || saving}
                    className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-slate-900 disabled:bg-slate-50"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Strata plan number
                  <input
                    value={strataNumber}
                    onChange={(event) => setStrataNumber(event.target.value)}
                    required
                    maxLength={40}
                    disabled={!canManage || saving}
                    className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-slate-900 disabled:bg-slate-50"
                  />
                </label>
                {canManage ? (
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saving ? <LoadingSpinner /> : null}
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                ) : (
                  <p className="text-sm text-slate-500">
                    Ask a strata administrator to update workspace details.
                  </p>
                )}
              </form>
            </div>
          ) : null}

          {tab === "team" ? (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Team</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    People with access to this strata workspace.
                  </p>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => setInviteOpen(true)}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Invite Resident
                  </button>
                ) : null}
              </div>
              {canManage ? (
                members.length ? (
                  <ul className="mt-6 divide-y divide-gray-100 rounded-xl border border-gray-100">
                    {members.map((member) => (
                      <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <span className="min-w-0 truncate text-sm font-medium text-slate-800">{member.email}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">
                          {member.role} · {member.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-6 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    No team members are available to display.
                  </p>
                )
              ) : (
                <p className="mt-6 rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
                  Team member details are visible to workspace administrators.
                </p>
              )}
            </div>
          ) : null}

          {tab === "billing" ? (
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Billing</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Subscription details for this strata workspace.
              </p>
              {portalNotice ? (
                <p
                  role="status"
                  className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                >
                  {portalNotice}
                </p>
              ) : null}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-slate-50 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current plan</p>
                  <p className="mt-1 font-semibold text-slate-900">{subscriptionStatus}</p>
                </div>
                {canOpenPortal ? (
                  <ManageBillingButton />
                ) : canManage ? (
                  <a
                    href="/billing"
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Start trial
                  </a>
                ) : null}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Update the card, download receipts, or cancel through Stripe’s
                secure customer portal. Stripe must have the Customer Portal
                enabled on this account.
              </p>
            </div>
          ) : null}
        </section>
      </div>

      {inviteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setInviteOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-resident-title"
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
          >
            <h2 id="invite-resident-title" className="text-lg font-semibold text-slate-900">
              Invite to this workspace
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              New users receive a Supabase invitation email with a secure link.
              Existing users are added immediately and can sign in as usual.
            </p>
            <form onSubmit={(event) => void sendInvite(event)} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Email
                <input
                  type="email"
                  required
                  maxLength={254}
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  disabled={inviteBusy}
                  className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-slate-900"
                  placeholder="resident@example.com"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Role
                <select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value)}
                  disabled={inviteBusy}
                  className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-slate-900"
                >
                  <option value="member">Resident / member</option>
                  <option value="council">Council</option>
                  <option value="treasurer">Treasurer</option>
                  <option value="auditor">Auditor</option>
                </select>
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  disabled={inviteBusy}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteBusy}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
                >
                  {inviteBusy ? <LoadingSpinner /> : null}
                  {inviteBusy ? "Sending…" : "Send invitation"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
