"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type InvoiceRecord = {
  id: string;
  storage_path: string;
  file_name: string;
  status: string;
  vendor: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  subtotal: number | string | null;
  tax: number | string | null;
  total: number | string | null;
  suggested_account_code: string | null;
  suggested_fund: string | null;
  extraction: {
    confidence?: string;
    notes?: string[];
  } | null;
  created_at: string;
};

const maximumFileSize = 20 * 1024 * 1024;
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

function safeFileName(fileName: string) {
  const safeName = fileName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(-120);
  return /^\.+$/.test(safeName) ? "" : safeName;
}

export function InvoiceReview({
  invoices,
  strataId,
  canProcess,
}: {
  invoices: InvoiceRecord[];
  strataId: string;
  canProcess: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function uploadInvoice(formData: FormData) {
    setMessage("");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setMessage("Choose an invoice file.");
      return;
    }
    if (file.size > maximumFileSize) {
      setMessage("Invoices must be 20 MB or smaller.");
      return;
    }
    if (!allowedTypes.has(file.type)) {
      setMessage("Choose a PDF, JPG, or PNG invoice.");
      return;
    }

    const fileName = safeFileName(file.name);
    if (!fileName) {
      setMessage("The file name is not supported.");
      return;
    }

    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const invoiceId = crypto.randomUUID();
    const storagePath = `${strataId}/invoices/${invoiceId}/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from("strata-invoices")
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setBusy(false);
      setMessage("The invoice could not be uploaded. Check your access and try again.");
      return;
    }

    const { error: recordError } = await supabase.from("invoices").insert({
      id: invoiceId,
      strata_id: strataId,
      storage_path: storagePath,
      file_name: fileName,
      mime_type: file.type,
      byte_size: file.size,
    });

    if (recordError) {
      const { error: cleanupError } = await supabase.storage
        .from("strata-invoices")
        .remove([storagePath]);
      setBusy(false);
      setMessage(
        cleanupError
          ? "The invoice record could not be saved and the uploaded file could not be cleaned up. Contact your administrator."
          : "The invoice record could not be saved, so the uploaded file was removed.",
      );
      return;
    }

    setBusy(false);
    setMessage("Invoice uploaded. It will not be sent for OCR until you choose Analyze.");
    router.refresh();
  }

  async function analyzeInvoice(invoiceId: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/invoices/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Invoice extraction failed.");
        return;
      }
      setMessage("Extraction saved for council review. It has not been posted to the ledger.");
      router.refresh();
    } catch {
      setMessage("Invoice extraction failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function openInvoice(storagePath: string) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.storage
      .from("strata-invoices")
      .createSignedUrl(storagePath, 60);
    if (error || !data) {
      setMessage("The invoice could not be opened.");
      return;
    }
    window.location.assign(data.signedUrl);
  }

  return (
    <section className="mt-8 space-y-5">
      <header>
        <h2 className="font-serif text-xl text-navy-950">
          Invoice OCR · council review
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-500">
          Upload PDFs or photos, then choose Analyze to send that invoice to
          OpenAI Vision for suggested fields and account coding. Review every
          result against the original. Nothing is posted to the ledger
          automatically.
        </p>
      </header>

      {canProcess ? (
        <form
          action={uploadInvoice}
          className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end"
        >
          <label className="flex-1 text-sm font-medium text-ink-700">
            Invoice file
            <input
              name="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              required
              className="mt-1.5 block w-full text-sm text-ink-500 file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-navy-900"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-pine-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-600 disabled:opacity-70"
          >
            {busy ? "Uploading…" : "Upload invoice"}
          </button>
        </form>
      ) : (
        <p className="rounded-lg bg-stone-50 p-4 text-sm text-ink-500">
          Auditor access is read-only. Finance actions are disabled.
        </p>
      )}

      {message ? (
        <p className="text-sm text-ink-700" role="status">
          {message}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 px-5 py-4">
          <h3 className="font-serif text-lg text-navy-950">Invoice queue</h3>
        </div>
        {invoices.length ? (
          <ul className="divide-y divide-stone-100">
            {invoices.map((invoice) => (
              <li key={invoice.id} className="space-y-3 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-900">
                      {invoice.vendor ?? invoice.file_name}
                      {invoice.invoice_number
                        ? ` · Invoice ${invoice.invoice_number}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs capitalize text-ink-500">
                      {invoice.status.replaceAll("_", " ")}
                      {invoice.invoice_date ? ` · ${invoice.invoice_date}` : ""}
                      {invoice.due_date ? ` · Due ${invoice.due_date}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => void openInvoice(invoice.storage_path)}
                      className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-navy-900 hover:bg-stone-100"
                    >
                      View original
                    </button>
                    {canProcess && ["uploaded", "review_required"].includes(invoice.status) ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void analyzeInvoice(invoice.id)}
                        className="rounded-lg bg-navy-900 px-3 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-70"
                      >
                        {busy ? "Analyzing…" : "Analyze"}
                      </button>
                    ) : null}
                  </div>
                </div>
                {invoice.status === "review_required" ? (
                  <div className="rounded-lg bg-stone-50 p-4 text-sm">
                    <p className="font-semibold text-pine-800">
                      Suggested account:{" "}
                      {invoice.suggested_account_code ?? "Council review needed"}
                      {invoice.suggested_fund
                        ? ` · ${invoice.suggested_fund} fund`
                        : ""}
                    </p>
                    <p className="mt-2 text-sm text-ink-900">
                      Subtotal{" "}
                      {invoice.subtotal !== null
                        ? currency.format(Number(invoice.subtotal))
                        : "not found"}
                      {" · "}Tax{" "}
                      {invoice.tax !== null
                        ? currency.format(Number(invoice.tax))
                        : "not found"}
                      {" · "}Total{" "}
                      {invoice.total !== null
                        ? currency.format(Number(invoice.total))
                        : "not found"}
                    </p>
                    <p className="mt-1 text-xs capitalize text-ink-500">
                      Extraction confidence:{" "}
                      {invoice.extraction?.confidence ?? "unknown"} · Not posted
                    </p>
                    {invoice.extraction?.notes?.length ? (
                      <ul className="mt-2 list-inside list-disc text-xs text-ink-500">
                        {invoice.extraction.notes.map((note, index) => (
                          <li key={`${invoice.id}-note-${index}`}>{note}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-sm text-ink-500">
            No invoices have been uploaded for council review.
          </p>
        )}
      </div>
    </section>
  );
}
