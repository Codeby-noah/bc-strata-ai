"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PhotoUploader } from "@/components/PhotoUploader";
import { toast } from "sonner";

const maximumPhotoSize = 5 * 1024 * 1024;

export function NewTicketModal({ strataId }: { strataId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<File | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setFieldErrors({});
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();
    const location = String(formData.get("location") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const urgency = String(formData.get("urgency") ?? "");
    if (!title || !location || !description) {
      setMessage("Add a title, location, and description.");
      toast.error("Complete the required maintenance request fields.");
      return;
    }
    if (!["low", "medium", "high", "emergency"].includes(urgency)) {
      setMessage("Choose a valid urgency.");
      toast.error("Choose a valid urgency.");
      return;
    }
    if (photo && photo.size > maximumPhotoSize) {
      setMessage("Photos must be 5 MB or smaller.");
      toast.error("Photos must be 5 MB or smaller.");
      return;
    }

    setBusy(true);
    const ticketId = crypto.randomUUID();
    const supabase = createSupabaseBrowserClient();
    let photoPath: string | null = null;
    try {
      if (photo) {
        const safeName = photo.name.replace(/[^\w.-]+/g, "_").slice(-100);
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          setMessage("Your sign-in expired. Sign in again before submitting.");
          toast.error("Your sign-in expired. Sign in again before submitting.");
          return;
        }
        photoPath = `${strataId}/${user.id}/${ticketId}/${safeName}`;
        try {
          await toast.promise(
            supabase.storage
              .from("maintenance-photos")
              .upload(photoPath, photo, {
                contentType: photo.type,
                upsert: false,
              })
              .then(({ data, error }) => {
                if (error) throw error;
                return data;
              }),
            {
              loading: "Uploading your photo…",
              success: "Photo uploaded securely.",
              error: "The photo could not be uploaded.",
            },
          );
        } catch {
          setMessage("The photo could not be uploaded. Check your access and try again.");
          return;
        }
      }

      const response = await fetch("/api/maintenance/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: ticketId,
          title,
          location,
          urgency,
          description,
          photo_url: photoPath,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        fieldErrors?: Record<string, string[] | undefined>;
      };
      if (!response.ok) {
        const errors = Object.fromEntries(
          Object.entries(result.fieldErrors ?? {})
            .filter(([, messages]) => messages?.length)
            .map(([field, messages]) => [field, messages?.[0] ?? "Invalid value."]),
        );
        setFieldErrors(errors);
        if (photoPath) {
          const { error: cleanupError } = await supabase.storage
            .from("maintenance-photos")
            .remove([photoPath]);
          setMessage(
            cleanupError
              ? "The request was not saved, and its uploaded photo could not be removed. Contact council."
              : result.error ?? "The request was not saved. Its uploaded photo was removed.",
          );
        } else {
          setMessage(result.error ?? "The request could not be saved. Check your access and try again.");
        }
        toast.error(result.error ?? "Failed to save the maintenance request.");
        return;
      }

      form.reset();
      setPhoto(null);
      setOpen(false);
      setMessage("Your maintenance request was submitted.");
      toast.success("Ticket submitted successfully");
      router.refresh();
    } catch {
      setMessage("The request could not be submitted. Check your connection and try again.");
      toast.error("Failed to submit the maintenance request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMessage("");
          setOpen(true);
        }}
        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
      >
        New maintenance request
      </button>
      {message && !open ? (
        <p role="status" className="mt-3 text-sm text-slate-600">{message}</p>
      ) : null}
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/30 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-ticket-title"
            className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl border border-gray-200 bg-white p-6 shadow-xl sm:max-w-xl sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Submit a new request
                </p>
                <h2 id="new-ticket-title" className="text-xl font-semibold text-slate-900">
                  Request a repair
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Tell us what needs attention. Council will follow up here.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                aria-label="Close dialog"
                className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                ×
              </button>
            </div>
            <form onSubmit={(event) => void submit(event)} className="mt-6 grid gap-4">
              <label className="text-sm font-medium text-slate-700">
                Title
                <input
                  name="title"
                  required
                  maxLength={160}
                  placeholder="Roof leak near Unit 12"
                  className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-slate-900"
                />
                <p className="mt-1 text-xs text-slate-500">
                A short summary helps council find your request later.
                </p>
                {fieldErrors.title ? <span className="mt-1 block text-sm text-red-600">{fieldErrors.title}</span> : null}
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Location
                  <input
                    name="location"
                    required
                    maxLength={160}
                    placeholder="Unit 12 or clubhouse"
                    className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-slate-900"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    e.g., Guest bathroom ceiling, Visitor Parking Stall 4
                  </p>
                  {fieldErrors.location ? <span className="mt-1 block text-sm text-red-600">{fieldErrors.location}</span> : null}
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Urgency
                  <select
                    name="urgency"
                    defaultValue="medium"
                    className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-slate-900"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="emergency">Emergency</option>
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Choose emergency only when there is an immediate safety risk.
                  </p>
                  {fieldErrors.urgency ? <span className="mt-1 block text-sm text-red-600">{fieldErrors.urgency}</span> : null}
                </label>
              </div>
              <label className="text-sm font-medium text-slate-700">
                Description
                <textarea
                  name="description"
                  required
                  maxLength={5000}
                  rows={4}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2 text-slate-900"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Include what happened and when you first noticed it.
                </p>
                {fieldErrors.description ? <span className="mt-1 block text-sm text-red-600">{fieldErrors.description}</span> : null}
              </label>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Photo (optional)
                </p>
                <p className="mb-2 mt-1 text-xs text-slate-500">
                  Add a photo to help council understand the issue.
                </p>
                <PhotoUploader
                  file={photo}
                  onChange={setPhoto}
                  onError={(error) => {
                    setMessage(error);
                    if (error) toast.error(error);
                  }}
                  disabled={busy}
                />
              </div>
              {message ? <p role="alert" className="text-sm text-red-700">{message}</p> : null}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2">
                    {busy ? <LoadingSpinner /> : null}
                    {busy ? "Saving…" : "Submit request"}
                  </span>
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
