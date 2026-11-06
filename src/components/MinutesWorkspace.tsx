"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export type MeetingRecord = {
  id: string;
  meeting_date: string;
  meeting_type: string;
  raw_notes: string;
  formatted_content: string | null;
  status: string;
  created_at: string;
};

const initialTemplate = `# Meeting Minutes

## 1. Call to Order
- [Confirm start time and presiding chair.]

## 2. Roll Call / Attendance
- [Confirm attendees, guests, regrets, and quorum.]

## 3. Approval of Previous Minutes
- [Record the motion and outcome.]

## 4. Financial Report
- [Record the treasurer's verified report and any motions.]

## 5. Maintenance & Property Reports
- [Record property updates and assigned follow-up.]

## 6. New Business
- [Record discussion, motions, outcomes, and action owners.]

## 7. Adjournment
- [Confirm the adjournment time.]`;

export function MinutesWorkspace({
  initialRecords,
}: {
  initialRecords: MeetingRecord[];
}) {
  const router = useRouter();
  const [records, setRecords] = useState(initialRecords);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [meetingType, setMeetingType] = useState("Council Meeting");
  const [meetingDate, setMeetingDate] = useState(todayLocal());
  const [rawNotes, setRawNotes] = useState("");
  const [formattedContent, setFormattedContent] = useState(initialTemplate);
  const [editingFormattedContent, setEditingFormattedContent] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savingStatus, setSavingStatus] = useState<"draft" | "published" | null>(null);
  const [message, setMessage] = useState("");

  async function generateMinutes() {
    if (!rawNotes.trim()) {
      setMessage("Enter the raw meeting notes before formatting.");
      return;
    }
    setGenerating(true);
    setMessage("");
    try {
      const response = await fetch("/api/minutes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawNotes,
          meetingType,
          meetingDate,
        }),
      });
      const result = (await response.json()) as {
        formattedContent?: string;
        error?: string;
      };
      if (!response.ok || !result.formattedContent) {
        setMessage(result.error ?? "Minutes could not be formatted.");
        return;
      }
      setFormattedContent(result.formattedContent);
      setEditingFormattedContent(false);
      setMessage("Structured draft created locally. Verify every detail before publishing.");
    } catch {
      setMessage("Minutes could not be formatted. Check your connection and try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveMinutes(status: "draft" | "published") {
    if (!formattedContent.trim()) {
      setMessage("Generate or enter the official minutes before saving.");
      return;
    }
    setSavingStatus(status);
    setMessage("");
    try {
      const response = await fetch("/api/minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedId,
          meeting_date: meetingDate,
          meeting_type: meetingType,
          raw_notes: rawNotes,
          formatted_content: formattedContent,
          status,
        }),
      });
      const result = (await response.json()) as {
        id?: string;
        status?: string;
        error?: string;
      };
      if (!response.ok || !result.id) {
        setMessage(result.error ?? "Minutes could not be saved.");
        return;
      }
      setSelectedId(result.id);
      setRecords((current) => {
        const existing = current.find((record) => record.id === result.id);
        const record: MeetingRecord = {
          id: result.id!,
          meeting_date: meetingDate,
          meeting_type: meetingType,
          raw_notes: rawNotes,
          formatted_content: formattedContent,
          status,
          created_at: existing?.created_at ?? new Date().toISOString(),
        };
        return [record, ...current.filter((item) => item.id !== result.id)].slice(0, 50);
      });
      setMessage(
        status === "published"
          ? "Published to the member portal. Email distribution is not configured."
          : "Minutes saved as a draft.",
      );
      router.refresh();
    } catch {
      setMessage("Minutes could not be saved. Check your connection and try again.");
    } finally {
      setSavingStatus(null);
    }
  }

  function loadRecord(record: MeetingRecord) {
    setSelectedId(record.id);
    setMeetingType(record.meeting_type);
    setMeetingDate(record.meeting_date);
    setRawNotes(record.raw_notes);
    setFormattedContent(record.formatted_content ?? initialTemplate);
    setEditingFormattedContent(false);
    setMessage(`Loaded ${record.status} minutes.`);
  }

  function newMinutes() {
    setSelectedId(null);
    setMeetingType("Council Meeting");
    setMeetingDate(todayLocal());
    setRawNotes("");
    setFormattedContent(initialTemplate);
    setEditingFormattedContent(false);
    setMessage("");
  }

  return (
    <div className="space-y-6">
      {initialRecords.length ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Saved meeting records</h2>
              <p className="mt-1 text-sm text-slate-500">Open a saved draft or published record.</p>
            </div>
            <button
              type="button"
              onClick={newMinutes}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              New minutes
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {records.map((record) => (
              <button
                type="button"
                key={record.id}
                onClick={() => loadRecord(record)}
                className={`rounded-xl border px-3 py-2 text-left text-sm ${
                  selectedId === record.id
                    ? "border-blue-200 bg-blue-50 text-blue-800"
                    : "border-gray-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="block font-medium">
                  {record.meeting_type} · {new Date(`${record.meeting_date}T00:00:00`).toLocaleDateString("en-CA")}
                </span>
                <span className="mt-0.5 block text-xs capitalize opacity-70">{record.status}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-sm font-medium text-slate-700">
            Meeting type
            <select
              value={meetingType}
              onChange={(event) => setMeetingType(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-3"
            >
              <option>Council Meeting</option>
              <option>AGM</option>
              <option>SGM</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Meeting date
            <input
              type="date"
              value={meetingDate}
              onChange={(event) => setMeetingDate(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3"
            />
          </label>
          <button
            type="button"
            onClick={() => void generateMinutes()}
            disabled={generating || savingStatus !== null}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {generating ? "Formatting…" : "Format with AI"}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          The current formatter uses a local template and does not call an AI service. It preserves supplied notes and does not invent meeting decisions.
        </p>
      </section>

      <form
        onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}
        className="grid items-start gap-5 xl:grid-cols-2"
      >
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <label htmlFor="raw-meeting-notes" className="block font-semibold text-slate-900">
            Raw Meeting Notes
          </label>
          <p className="mt-1 text-sm text-slate-500">
            Add shorthand notes. They are kept with the saved record for review.
          </p>
          <textarea
            id="raw-meeting-notes"
            value={rawNotes}
            onChange={(event) => setRawNotes(event.target.value)}
            maxLength={20000}
            rows={24}
            placeholder={"Chair opened meeting at 7pm\nPresent: ...\nRoof quote discussed ..."}
            className="mt-4 min-h-[26rem] w-full resize-y rounded-xl border border-gray-200 bg-zinc-50 p-4 text-sm leading-6 text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <p className="mt-2 text-right text-xs text-slate-400">{rawNotes.length}/20,000</p>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Official Minutes</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review the structured draft before saving or publishing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingFormattedContent((editing) => !editing)}
              className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {editingFormattedContent ? "Preview" : "Edit text"}
            </button>
          </div>
          {editingFormattedContent ? (
            <textarea
              aria-label="Edit formatted minutes"
              value={formattedContent}
              onChange={(event) => setFormattedContent(event.target.value)}
              maxLength={50000}
              rows={24}
              className="mt-4 min-h-[26rem] w-full resize-y rounded-xl border border-gray-200 bg-zinc-50 p-4 font-mono text-sm leading-6 text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          ) : (
            <div className="mt-4 min-h-[26rem] rounded-xl border border-gray-100 bg-white p-5">
              <MinutesPreview content={formattedContent} />
            </div>
          )}
          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => void saveMinutes("draft")}
              disabled={generating || savingStatus !== null}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {savingStatus === "draft" ? "Saving…" : "Save as Draft"}
            </button>
            <button
              type="button"
              onClick={() => void saveMinutes("published")}
              disabled={generating || savingStatus !== null}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {savingStatus === "published" ? "Publishing…" : "Publish & Distribute"}
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Publishing makes the minutes visible to members in this strata portal. Email delivery is not configured.
          </p>
        </section>
      </form>

      {message ? (
        <p role="status" className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function todayLocal() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function MinutesPreview({ content }: { content: string }) {
  return (
    <div className="space-y-3 text-sm leading-6 text-slate-700">
      {content.split(/\r?\n/).map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} aria-hidden className="h-1" />;
        if (trimmed.startsWith("# ")) {
          return (
            <h3 key={index} className="border-b border-gray-200 pb-2 text-xl font-semibold text-slate-900">
              {trimmed.slice(2)}
            </h3>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h4 key={index} className="pt-2 font-semibold text-slate-900">
              {trimmed.slice(3)}
            </h4>
          );
        }
        if (trimmed.startsWith("> ")) {
          return (
            <p key={index} className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {trimmed.slice(2)}
            </p>
          );
        }
        if (/^\s*-\s/.test(line)) {
          return (
            <p key={index} className="pl-4">
              <span className="mr-2 text-slate-400" aria-hidden>•</span>
              {trimmed.replace(/^-\s*/, "")}
            </p>
          );
        }
        return <p key={index}>{trimmed}</p>;
      })}
    </div>
  );
}
