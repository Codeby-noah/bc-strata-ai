"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { printPlainDocument } from "@/lib/print-document";

export type FormRequestRow = {
  id: string;
  requested_by: string;
  unit_number: string;
  form_type: string;
  status: string;
  amount_due: number | string;
  created_at: string;
};

type PreviewData = {
  formRequest: FormRequestRow;
  strata: { name: string; strataNumber: string };
  crfBalance: number | null;
  parking: Array<{ unit_number: string; stall_number: string; asset_type: string }>;
  bylawExcerpts: Array<{
    document_id: string;
    title: string;
    page_number: number | null;
    section: string | null;
    content: string;
  }>;
  notices: string[];
};

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

export function FormRequestsWorkspace({
  requests,
}: {
  requests: FormRequestRow[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [requester, setRequester] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [formType, setFormType] = useState("Form B");

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/forms/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requested_by: requester,
          unit_number: unitNumber,
          form_type: formType,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "The request could not be saved.");
        toast.error(result.error ?? "The request could not be saved.");
        return;
      }
      setRequester("");
      setUnitNumber("");
      setFormOpen(false);
      setMessage("Request created and marked pending payment. No payment was collected.");
      toast.success("Form request saved successfully.");
      router.refresh();
    } catch {
      setMessage("The request could not be saved. Check your connection and try again.");
      toast.error("The request could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function processRequest(requestId: string) {
    setProcessingId(requestId);
    setMessage("");
    setPreview(null);
    try {
      const response = await fetch("/api/forms/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const result = (await response.json()) as PreviewData & { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "The preview could not be prepared.");
        toast.error(result.error ?? "The preview could not be prepared.");
        return;
      }
      setPreview(result);
      toast.success("Form preview prepared.");
    } catch {
      setMessage("The preview could not be prepared. Check your connection and try again.");
      toast.error("The preview could not be prepared.");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">Incoming requests</h2>
            <p className="mt-1 text-sm text-slate-500">
              Requests remain pending until payment and council review are confirmed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormOpen((open) => !open)}
            aria-expanded={formOpen}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            {formOpen ? "Close" : "New request"}
          </button>
        </div>

        {formOpen ? (
          <form
            onSubmit={(event) => void createRequest(event)}
            className="grid gap-4 border-b border-gray-100 bg-zinc-50 p-5 sm:grid-cols-3 sm:items-end"
          >
            <label className="text-sm font-medium text-slate-700">
              Requester (realtor / lawyer)
              <input
                value={requester}
                onChange={(event) => setRequester(event.target.value)}
                maxLength={160}
                required
                className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-3"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Unit number
              <input
                value={unitNumber}
                onChange={(event) => setUnitNumber(event.target.value)}
                maxLength={40}
                required
                className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-3"
              />
            </label>
            <div className="flex gap-3">
              <label className="min-w-0 flex-1 text-sm font-medium text-slate-700">
                Form
                <select
                  value={formType}
                  onChange={(event) => setFormType(event.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-3"
                >
                  <option>Form B</option>
                  <option>Form F</option>
                </select>
              </label>
              <button
                type="submit"
                disabled={busy}
                className="self-end rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-2">
                  {busy ? <LoadingSpinner /> : null}
                  {busy ? "Saving…" : "Create"}
                </span>
              </button>
            </div>
          </form>
        ) : null}

        {message ? (
          <p role="status" className="border-b border-gray-100 px-5 py-3 text-sm text-slate-700">
            {message}
          </p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Unit</th>
                <th className="px-5 py-3 font-semibold">Requester</th>
                <th className="px-5 py-3 font-semibold">Form type</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((request) => (
                <tr key={request.id} className="text-slate-700">
                  <td className="whitespace-nowrap px-5 py-4">
                    {new Date(request.created_at).toLocaleDateString("en-CA")}
                  </td>
                  <td className="px-5 py-4">{request.unit_number}</td>
                  <td className="px-5 py-4">{request.requested_by}</td>
                  <td className="px-5 py-4">{request.form_type}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      {request.status.replaceAll("_", " ")} · {currency.format(Number(request.amount_due))}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => void processRequest(request.id)}
                      disabled={processingId !== null}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-2">
                        {processingId === request.id ? <LoadingSpinner /> : null}
                        {processingId === request.id ? "Preparing…" : "Process"}
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                    No Form B or Form F requests are recorded for this strata.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {preview ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreview(null);
          }}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-preview-title"
            className="h-full w-full max-w-6xl overflow-y-auto bg-zinc-50 shadow-2xl"
          >
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/90 px-5 py-4 backdrop-blur sm:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Council workspace · Preview only
                </p>
                <h2 id="form-preview-title" className="mt-1 text-lg font-semibold text-slate-900">
                  {preview.formRequest.form_type} · Unit {preview.formRequest.unit_number}
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => printPlainDocument(
                    `${preview.formRequest.form_type} draft · Unit ${preview.formRequest.unit_number}`,
                    formDraftText(preview),
                  )}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Print draft
                </button>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </header>
            <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.4fr)]">
              <section className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-slate-900">Preparation checklist</h3>
                <ul className="mt-4 space-y-4 text-sm">
                  <ChecklistItem
                    label="Current CRF balance"
                    detail={
                      preview.crfBalance === null
                        ? "No contingency accounts configured"
                        : currency.format(preview.crfBalance)
                    }
                    complete={preview.crfBalance !== null}
                  />
                  <ChecklistItem
                    label="Active lawsuits"
                    detail="Manual council confirmation required"
                    complete={false}
                  />
                  <ChecklistItem
                    label="Unit parking allocations"
                    detail={
                      preview.parking.length
                        ? preview.parking.map((item) => item.stall_number).join(", ")
                        : "No assigned assets found for this unit"
                    }
                    complete={preview.parking.length > 0}
                  />
                  <ChecklistItem
                    label="Current bylaws"
                    detail={
                      preview.bylawExcerpts.length
                        ? `${preview.bylawExcerpts.length} indexed excerpt(s)`
                        : "No indexed bylaw excerpts found"
                    }
                    complete={preview.bylawExcerpts.length > 0}
                  />
                </ul>
              </section>

              <article className="min-h-[70vh] rounded-sm border border-gray-200 bg-white p-7 shadow-md sm:p-10">
                <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {preview.strata.name}
                </p>
                <h3 className="mt-2 text-center text-xl font-bold tracking-wide text-slate-900">
                  {preview.formRequest.form_type === "Form B"
                    ? "INFORMATION CERTIFICATE"
                    : "CERTIFICATE OF PAYMENT"}
                </h3>
                <p className="mt-1 text-center text-sm text-slate-500">
                  Draft data preview · LMS {preview.strata.strataNumber}
                </p>
                <div className="mt-8 grid gap-4 border-y border-gray-200 py-5 text-sm sm:grid-cols-2">
                  <PreviewField label="Unit" value={preview.formRequest.unit_number} />
                  <PreviewField label="Requester" value={preview.formRequest.requested_by} />
                  <PreviewField
                    label="Form fee"
                    value={currency.format(Number(preview.formRequest.amount_due))}
                  />
                  <PreviewField
                    label="Request status"
                    value={preview.formRequest.status.replaceAll("_", " ")}
                  />
                  <PreviewField
                    label="Contingency reserve balance"
                    value={
                      preview.crfBalance === null
                        ? "Not available"
                        : currency.format(preview.crfBalance)
                    }
                  />
                  <PreviewField
                    label="Parking / storage allocations"
                    value={
                      preview.parking.length
                        ? preview.parking
                            .map((item) => `${item.asset_type.replaceAll("_", " ")} · ${item.stall_number}`)
                            .join("; ")
                        : "No assignment on record"
                    }
                  />
                </div>
                <section className="mt-6">
                  <h4 className="text-sm font-semibold text-slate-900">Bylaw source excerpts</h4>
                  {preview.bylawExcerpts.length ? (
                    <ul className="mt-3 space-y-3">
                      {preview.bylawExcerpts.map((excerpt, index) => (
                        <li key={`${excerpt.document_id}-${index}`} className="rounded-xl bg-zinc-50 p-3 text-xs leading-5 text-slate-600">
                          <p className="font-semibold text-slate-800">
                            {excerpt.title}
                            {excerpt.page_number ? ` · Page ${excerpt.page_number}` : ""}
                            {excerpt.section ? ` · ${excerpt.section}` : ""}
                          </p>
                          <p className="mt-1 line-clamp-5">{excerpt.content}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      No indexed bylaw excerpts are available for this workspace.
                    </p>
                  )}
                </section>
                <div className="mt-8 space-y-2 border-t border-gray-200 pt-5 text-xs leading-5 text-amber-900">
                  {preview.notices.map((notice) => <p key={notice}>{notice}</p>)}
                </div>
              </article>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function formDraftText(preview: PreviewData) {
  const lines = [
    `${preview.strata.name} · LMS ${preview.strata.strataNumber}`,
    preview.formRequest.form_type === "Form B" ? "INFORMATION CERTIFICATE" : "CERTIFICATE OF PAYMENT",
    "Draft data preview. This is not a certified Form B or Form F.",
    "",
    `Unit: ${preview.formRequest.unit_number}`,
    `Requester: ${preview.formRequest.requested_by}`,
    `Form fee on record: ${currency.format(Number(preview.formRequest.amount_due))}`,
    `Request status: ${preview.formRequest.status.replaceAll("_", " ")}`,
    `Contingency reserve balance: ${preview.crfBalance === null ? "Not available" : currency.format(preview.crfBalance)}`,
    `Parking / storage: ${
      preview.parking.length
        ? preview.parking.map((item) => `${item.asset_type.replaceAll("_", " ")} ${item.stall_number}`).join("; ")
        : "No assignment on record"
    }`,
    "",
    "Bylaw source excerpts",
  ];
  if (preview.bylawExcerpts.length) {
    for (const excerpt of preview.bylawExcerpts) {
      lines.push(
        `${excerpt.title}${excerpt.page_number ? ` · Page ${excerpt.page_number}` : ""}${excerpt.section ? ` · ${excerpt.section}` : ""}`,
        excerpt.content,
        "",
      );
    }
  } else {
    lines.push("No indexed bylaw excerpts are available.", "");
  }
  lines.push(...preview.notices);
  return lines.join("\n");
}

function ChecklistItem({
  label,
  detail,
  complete,
}: {
  label: string;
  detail: string;
  complete: boolean;
}) {
  return (
    <li className="flex gap-3">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          complete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
        }`}
        aria-hidden
      >
        {complete ? "✓" : "!"}
      </span>
      <span>
        <span className="block font-medium text-slate-800">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{detail}</span>
      </span>
    </li>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-slate-800">{value}</p>
    </div>
  );
}
