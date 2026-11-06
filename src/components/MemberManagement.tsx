"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { StrataRole } from "@/lib/strata/roles";

export type StrataMemberRecord = {
  user_id: string;
  email: string;
  role: StrataRole;
  status: string;
  created_at: string;
};

const roles: Array<{ value: StrataRole; label: string }> = [
  { value: "admin", label: "Administrator" },
  { value: "council", label: "Council" },
  { value: "treasurer", label: "Treasurer" },
  { value: "member", label: "Resident / member" },
  { value: "auditor", label: "Auditor (read-only finance)" },
];

export function MemberManagement({
  members,
  currentUserId,
}: {
  members: StrataMemberRecord[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/strata/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          role: formData.get("role"),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "The member could not be added.");
        return;
      }
      form.reset();
      setMessage("Workspace access updated.");
      router.refresh();
    } catch {
      setMessage("The member could not be added. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function updateMember(
    userId: string,
    changes: { role?: StrataRole; status?: "active" | "disabled" },
  ) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/strata/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...changes }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Member access could not be updated.");
        return;
      }
      setMessage("Member access updated.");
      router.refresh();
    } catch {
      setMessage("Member access could not be updated. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <form
        onSubmit={(event) => void addMember(event)}
        className="grid gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto]"
      >
        <label className="text-sm font-medium text-ink-700">
          Registered user email
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            className="mt-1.5 h-11 w-full rounded-lg border border-stone-200 px-3 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-ink-700">
          Workspace role
          <select
            name="role"
            defaultValue="member"
            className="mt-1.5 h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm"
          >
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="self-end rounded-lg bg-pine-700 px-4 py-3 text-sm font-semibold text-white hover:bg-pine-600 disabled:opacity-70"
        >
          {busy ? "Saving…" : "Add member"}
        </button>
        <p className="text-xs leading-5 text-ink-500 sm:col-span-3">
          They must create and verify their BC Strata account first. This grants
          workspace access immediately; no invitation email is sent.
        </p>
        {message ? (
          <p className="text-sm text-ink-700 sm:col-span-3" role="status">
            {message}
          </p>
        ) : null}
      </form>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 px-5 py-4">
          <h2 className="font-serif text-lg text-navy-950">
            People with workspace access
          </h2>
        </div>
        <ul className="divide-y divide-stone-100">
          {members.map((member) => (
            <MemberRow
              key={member.user_id}
              member={member}
              isCurrentUser={member.user_id === currentUserId}
              busy={busy}
              onUpdate={(changes) => updateMember(member.user_id, changes)}
            />
          ))}
        </ul>
        {members.length === 0 ? (
          <p className="px-5 py-8 text-sm text-ink-500">
            No members are assigned to this workspace yet.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function MemberRow({
  member,
  isCurrentUser,
  busy,
  onUpdate,
}: {
  member: StrataMemberRecord;
  isCurrentUser: boolean;
  busy: boolean;
  onUpdate: (changes: { role?: StrataRole; status?: "active" | "disabled" }) => void;
}) {
  const [role, setRole] = useState(member.role);
  const roleLabel = role === "member" ? "Resident / member" : role;

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div>
        <p className="font-medium text-ink-900">{member.email}</p>
        <p className="mt-1 text-xs capitalize text-ink-500">
          {roleLabel} · {member.status}
          {isCurrentUser ? " · You" : ""}
        </p>
        <p className="mt-1 text-xs text-ink-500">
          Added {member.created_at.slice(0, 10)}
        </p>
      </div>
      {!isCurrentUser ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`role-${member.user_id}`}>
            Role for {member.email}
          </label>
          <select
            id={`role-${member.user_id}`}
            value={role}
            onChange={(event) => setRole(event.target.value as StrataRole)}
            className="h-9 rounded-lg border border-stone-200 bg-white px-2 text-sm capitalize"
          >
            {roles.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {role !== member.role ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onUpdate({ role })}
              className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-navy-900 hover:bg-stone-100 disabled:opacity-60"
            >
              Save role
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onUpdate({ status: member.status === "active" ? "disabled" : "active" })
            }
            className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-stone-100 disabled:opacity-60"
          >
            {member.status === "active" ? "Disable access" : "Restore access"}
          </button>
        </div>
      ) : null}
    </li>
  );
}
