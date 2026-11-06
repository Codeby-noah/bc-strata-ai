"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";

export type FeatureWorkspaceContent = {
  eyebrow: string;
  title: string;
  description: string;
  metrics: { label: string; value: string; note: string }[];
  sections: {
    title: string;
    description: string;
    emptyTitle: string;
    emptyDescription: string;
  }[];
};

type FeatureKey = "maintenance" | "amenities" | "parking" | "voting" | "compliance";
type Item = Record<string, unknown> & { id: string };
type Props = { content: FeatureWorkspaceContent; feature: FeatureKey };

const fieldClass =
  "mt-1.5 h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-pine-700 focus:ring-2 focus:ring-pine-700/20";
const textAreaClass =
  "mt-1.5 min-h-24 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-pine-700 focus:ring-2 focus:ring-pine-700/20";

export function FeatureWorkspace({ content, feature }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [spaces, setSpaces] = useState<Item[]>([]);
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canManage = role === "admin" || role === "council";

  const loadItems = useCallback(async () => {
    try {
      const response = await fetch(`/api/workspace/${feature}`, {
        cache: "no-store",
      });
      const result = await response.json() as {
        items?: Item[];
        spaces?: Item[];
        reservations?: Item[];
        role?: string;
        userId?: string;
        error?: string;
      };
      setLoadError("");
      if (!response.ok) {
        setLoadError(result.error ?? "This section could not be loaded.");
        setItems([]);
        setSpaces([]);
        return;
      }
      setRole(result.role ?? "");
      const loadedItems =
        feature === "amenities"
          ? (result.reservations ?? [])
          : (result.items ?? []);
      setItems(
        feature === "voting"
          ? loadedItems.map((item) => ({
              ...item,
              voted: Array.isArray(item.governance_votes) &&
                (item.governance_votes as Item[]).some((vote) => vote.user_id === result.userId),
            }))
          : loadedItems,
      );
      setSpaces(result.spaces ?? []);
    } catch {
      setLoadError("This section could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [feature]);

  useEffect(() => {
    let active = true;
    async function fetchInitialItems() {
      try {
        const response = await fetch(`/api/workspace/${feature}`, {
          cache: "no-store",
        });
        const result = await response.json() as {
          items?: Item[];
          spaces?: Item[];
          reservations?: Item[];
          role?: string;
          userId?: string;
          error?: string;
        };
        if (!active) return;
        if (!response.ok) {
          setLoadError(result.error ?? "This section could not be loaded.");
          return;
        }
        setRole(result.role ?? "");
        const loadedItems =
          feature === "amenities"
            ? (result.reservations ?? [])
            : (result.items ?? []);
        setItems(
          feature === "voting"
            ? loadedItems.map((item) => ({
                ...item,
                voted: Array.isArray(item.governance_votes) &&
                  (item.governance_votes as Item[]).some((vote) => vote.user_id === result.userId),
              }))
            : loadedItems,
        );
        setSpaces(result.spaces ?? []);
      } catch {
        if (active) {
          setLoadError("This section could not be loaded. Check your connection and try again.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void fetchInitialItems();
    return () => {
      active = false;
    };
  }, [feature]);

  async function submit(
    event: FormEvent<HTMLFormElement>,
    operation?: string,
  ) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());
    for (const field of ["starts_at", "ends_at", "closes_at"]) {
      const value = body[field];
      if (typeof value === "string" && value) {
        body[field] = new Date(value).toISOString();
      }
    }
    if (operation) body.operation = operation;

    try {
      const response = await fetch(`/api/workspace/${feature}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "The record could not be saved.");
        return;
      }
      form.reset();
      setMessage("Saved successfully.");
      await loadItems();
      router.refresh();
    } catch {
      setMessage("The record could not be saved. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function updateItem(id: string, status: string) {
    setMessage("");
    try {
      const response = await fetch(`/api/workspace/${feature}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "The record could not be updated.");
        return;
      }
      setMessage("Updated successfully.");
      await loadItems();
    } catch {
      setMessage("The record could not be updated. Check your connection and try again.");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
      />

      {loadError ? (
        <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-brass-500/30 bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-navy-950">
              Workspace setup required
            </p>
            <p className="mt-1 text-sm leading-6 text-ink-500">{loadError}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadItems()}
            className="shrink-0 rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-navy-900 hover:bg-stone-50"
          >
            Retry
          </button>
        </div>
      ) : null}

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label={`${content.title} overview`}
      >
        {content.metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-ink-500">{metric.label}</p>
            <p className="mt-2 font-serif text-2xl text-navy-950">
              {metricValue(metric.label, items, spaces, loading)}
            </p>
            <p className="mt-1 text-xs text-ink-500">{metric.note}</p>
          </article>
        ))}
      </section>

      {message ? (
        <p className="mt-5 text-sm font-medium text-pine-800" role="status">
          {message}
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-serif text-lg text-navy-950">
            {formTitle(feature)}
          </h2>
          <p className="mt-1 text-sm leading-6 text-ink-500">
            Submissions are saved to the active strata workspace.
          </p>
          <div className="mt-5">{renderForm()}</div>
        </section>

        {content.sections.map((section, index) => {
          const sectionItems =
            feature === "amenities" && index === 0
              ? spaces
              : feature === "amenities"
                ? items
                : feature === "voting" && index === 1
                  ? items.filter((item) => item.status !== "open")
                  : feature === "voting"
                    ? items.filter((item) => item.status === "open")
                    : index === 0
                      ? items
                      : [];
          return (
            <section
              key={section.title}
              className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
            >
              <div className="border-b border-stone-100 px-5 py-4">
                <h2 className="font-serif text-lg text-navy-950">
                  {section.title}
                </h2>
                <p className="mt-1 text-sm text-ink-500">{section.description}</p>
              </div>
              {loading ? (
                <p className="px-5 py-8 text-center text-sm text-ink-500">
                  Loading records…
                </p>
              ) : sectionItems.length ? (
                <ul className="divide-y divide-stone-100">
                  {sectionItems.map((item) => (
                    <li key={item.id} className="space-y-3 px-5 py-4">
                      <ItemSummary item={item} feature={feature} />
                      {feature === "maintenance" && canManage ? (
                        <StatusActions
                          item={item}
                          statuses={["triaged", "in_progress", "completed", "closed"]}
                          onUpdate={updateItem}
                        />
                      ) : null}
                      {feature === "amenities" && index === 1 && canManage && item.status === "requested" ? (
                        <StatusActions
                          item={item}
                          statuses={["approved", "declined"]}
                          onUpdate={updateItem}
                        />
                      ) : null}
                      {feature === "compliance" && canManage ? (
                        <StatusActions
                          item={item}
                          statuses={["completed", "upcoming", "dismissed"]}
                          onUpdate={updateItem}
                        />
                      ) : null}
                      {feature === "voting" && item.status === "open" && Array.isArray(item.options) ? (
                        <div className="flex flex-wrap gap-2">
                          {(item.options as string[]).map((choice) => (
                            <button
                              key={choice}
                              type="button"
                              disabled={Boolean(item.voted)}
                              onClick={() => void castVote(item.id, choice)}
                              className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-navy-900 hover:bg-stone-50 disabled:opacity-50"
                            >
                              {item.voted ? "Vote recorded" : choice}
                            </button>
                          ))}
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => void updateItem(item.id, "closed")}
                              className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-ink-700"
                            >
                              Close vote
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-5 py-8 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-ink-500">
                    <EmptyStateIcon />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-navy-950">
                    {section.emptyTitle}
                  </h3>
                  <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-ink-500">
                    {section.emptyDescription}
                  </p>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );

  function renderForm(): ReactNode {
    if (feature === "maintenance") {
      return (
        <form className="space-y-3" onSubmit={(event) => void submit(event)}>
          <Field label="Issue title" name="title" required maxLength={160} />
          <Field label="Location (unit, building, or shared area)" name="location" required maxLength={160} />
          <label className="block text-sm font-medium text-ink-700">
            Priority
            <select name="priority" className={fieldClass}>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
              <option value="high">High</option>
              <option value="emergency">Emergency</option>
            </select>
          </label>
          <TextArea label="Description" name="description" required maxLength={5000} />
          <SubmitButton saving={saving} label="Submit maintenance request" />
        </form>
      );
    }
    if (feature === "amenities") {
      return (
        <div className="space-y-6">
          {canManage ? (
            <form className="space-y-3 border-b border-stone-100 pb-5" onSubmit={(event) => void submit(event, "create_space")}>
              <h3 className="text-sm font-semibold text-navy-950">Add a shared space</h3>
              <Field label="Space name" name="name" required maxLength={120} />
              <Field label="Description (optional)" name="description" maxLength={1000} />
              <SubmitButton saving={saving} label="Add space" />
            </form>
          ) : null}
          <form className="space-y-3" onSubmit={(event) => void submit(event)}>
            <h3 className="text-sm font-semibold text-navy-950">Request a booking</h3>
            <label className="block text-sm font-medium text-ink-700">
              Shared space
              <select name="space_id" className={fieldClass} required>
                <option value="">Choose a space</option>
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>{String(space.name)}</option>
                ))}
              </select>
            </label>
            <Field label="Start time" name="starts_at" type="datetime-local" required />
            <Field label="End time" name="ends_at" type="datetime-local" required />
            <Field label="Purpose" name="purpose" required maxLength={500} />
            <SubmitButton saving={saving} label="Request booking" />
          </form>
        </div>
      );
    }
    if (feature === "parking") {
      return (
        <form className="space-y-3" onSubmit={(event) => void submit(event)}>
          <Field label="Visitor name" name="visitor_name" required maxLength={120} />
          <Field label="Vehicle plate" name="vehicle_plate" required maxLength={24} />
          <Field label="Visitor stall" name="stall" required maxLength={80} />
          <Field label="Valid from" name="starts_at" type="datetime-local" required />
          <Field label="Valid until" name="ends_at" type="datetime-local" required />
          <SubmitButton saving={saving} label="Issue parking pass" />
        </form>
      );
    }
    if (feature === "voting") {
      return (
        <div className="space-y-6">
          {canManage ? (
            <form className="space-y-3 border-b border-stone-100 pb-5" onSubmit={(event) => void submit(event)}>
              <h3 className="text-sm font-semibold text-navy-950">Open a council vote</h3>
              <Field label="Decision title" name="title" required maxLength={200} />
              <TextArea label="Details (optional)" name="description" maxLength={5000} />
              <Field label="Options (comma-separated)" name="options" required defaultValue="For, Against, Abstain" />
              <Field label="Voting closes" name="closes_at" type="datetime-local" required />
              <SubmitButton saving={saving} label="Open vote" />
            </form>
          ) : (
            <p className="rounded-lg bg-stone-50 p-4 text-sm leading-6 text-ink-500">
              Voting is currently limited to active council members. Ask your
              strata administrator if you believe you should have council access.
            </p>
          )}
        </div>
      );
    }
    return canManage ? (
      <form className="space-y-3" onSubmit={(event) => void submit(event)}>
        <Field label="Reminder or warranty title" name="title" required maxLength={200} />
        <label className="block text-sm font-medium text-ink-700">
          Category
          <select name="category" className={fieldClass}>
            <option value="compliance">Compliance</option>
            <option value="insurance">Insurance</option>
            <option value="warranty">Warranty</option>
            <option value="maintenance">Maintenance</option>
            <option value="other">Other</option>
          </select>
        </label>
        <Field label="Due date" name="due_date" type="date" required />
        <TextArea label="Notes (optional)" name="notes" maxLength={2000} />
        <SubmitButton saving={saving} label="Add reminder" />
      </form>
    ) : (
      <p className="rounded-lg bg-stone-50 p-4 text-sm leading-6 text-ink-500">
        Only active council members can manage compliance and warranty dates.
      </p>
    );
  }

  async function castVote(proposalId: string, choice: string) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/workspace/${feature}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "vote", proposal_id: proposalId, choice }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Your vote could not be saved.");
        return;
      }
      setMessage("Your vote has been recorded.");
      await loadItems();
    } catch {
      setMessage("Your vote could not be saved. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }
}

function metricValue(
  label: string,
  items: Item[],
  spaces: Item[],
  loading: boolean,
) {
  if (loading) return "—";
  if (label === "Open requests") {
    return String(items.filter((item) => !["completed", "closed"].includes(String(item.status))).length);
  }
  if (label === "In progress") {
    return String(items.filter((item) => item.status === "in_progress").length);
  }
  if (label === "Completed this year") {
    return String(items.filter((item) => item.status === "completed").length);
  }
  if (label === "Shared spaces") return String(spaces.length);
  if (label === "Booking requests") {
    return String(items.filter((item) => ["requested", "approved"].includes(String(item.status))).length);
  }
  if (label === "Confirmed bookings") {
    return String(items.filter((item) => item.status === "approved").length);
  }
  if (label === "Awaiting review") {
    return String(items.filter((item) => item.status === "requested").length);
  }
  if (label === "Passes issued") return String(items.length);
  if (label === "Expiring today") return "—";
  if (label === "Issued this month") return String(items.length);
  if (label === "Open votes") return String(items.filter((item) => item.status === "open").length);
  if (label === "Awaiting your vote") {
    return String(items.filter((item) => item.status === "open" && !item.voted).length);
  }
  if (label === "Recently closed") {
    return String(items.filter((item) => item.status !== "open").length);
  }
  if (label === "Upcoming deadlines") {
    return String(items.filter((item) => item.status === "upcoming").length);
  }
  if (label === "Warranty records") {
    return String(items.filter((item) => item.category === "warranty").length);
  }
  return "—";
}

function formTitle(feature: FeatureKey) {
  return {
    maintenance: "Report an issue",
    amenities: "Bookings & shared spaces",
    parking: "Issue a visitor pass",
    voting: "Council decisions",
    compliance: "Add a deadline",
  }[feature];
}

function Field({
  label,
  name,
  type = "text",
  ...props
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm font-medium text-ink-700">
      {label}
      <input name={name} type={type} className={fieldClass} {...props} />
    </label>
  );
}

function TextArea({
  label,
  name,
  required,
  maxLength,
}: {
  label: string;
  name: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="block text-sm font-medium text-ink-700">
      {label}
      <textarea
        name={name}
        required={required}
        maxLength={maxLength}
        className={textAreaClass}
      />
    </label>
  );
}

function SubmitButton({ saving, label }: { saving: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="rounded-lg bg-pine-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-600 disabled:opacity-60"
    >
      {saving ? "Saving…" : label}
    </button>
  );
}

function ItemSummary({ item, feature }: { item: Item; feature: FeatureKey }) {
  const main =
    feature === "maintenance" ? item.title :
      feature === "amenities" ? (item.amenity_spaces as { name?: string } | null)?.name ?? "Amenity booking" :
        feature === "parking" ? `Visitor: ${String(item.visitor_name ?? "")}` :
          feature === "voting" ? item.title :
            item.title;
  const detail = [
    feature === "maintenance" ? item.location : null,
    feature === "maintenance" ? item.description : null,
    feature === "amenities" ? item.purpose : null,
    feature === "parking" ? `${String(item.vehicle_plate ?? "")} · Stall ${String(item.stall ?? "")}` : null,
    feature === "voting" ? item.description : null,
    feature === "compliance" ? item.notes : null,
  ].filter((value) => typeof value === "string" && value);
  const date =
    feature === "compliance" ? item.due_date :
      feature === "amenities" ? item.starts_at :
        feature === "parking" ? item.starts_at :
          item.created_at;
  const status = typeof item.status === "string" ? item.status.replaceAll("_", " ") : "";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="font-semibold text-ink-900">{String(main ?? "")}</p>
        {status ? (
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold capitalize text-pine-800">
            {status}
          </span>
        ) : null}
      </div>
      {detail.map((line, index) => (
        <p key={index} className="mt-1 text-sm text-ink-500">{String(line)}</p>
      ))}
      {typeof date === "string" ? (
        <p className="mt-1 text-xs text-ink-500">
          {Number.isNaN(Date.parse(date)) ? date : new Date(date).toLocaleString("en-CA")}
        </p>
      ) : null}
      {feature === "voting" && Array.isArray(item.governance_votes) ? (
        <p className="mt-2 text-xs text-ink-500">
          {item.voted ? "Your vote is recorded" : "No vote recorded for your account"}
          {" · "}
          {(item.governance_votes as Item[]).length} council vote(s) recorded
        </p>
      ) : null}
    </div>
  );
}

function StatusActions({
  item,
  statuses,
  onUpdate,
}: {
  item: Item;
  statuses: string[];
  onUpdate: (id: string, status: string) => Promise<void>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {statuses.filter((status) => status !== item.status).map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => void onUpdate(item.id, status)}
          className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold capitalize text-navy-900 hover:bg-stone-50"
        >
          Mark {status.replaceAll("_", " ")}
        </button>
      ))}
    </div>
  );
}

function EmptyStateIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden>
      <path
        d="M5 5.5h10M5 10h10M5 14.5h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect
        x="2.75"
        y="2.75"
        width="14.5"
        height="14.5"
        rx="2.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
