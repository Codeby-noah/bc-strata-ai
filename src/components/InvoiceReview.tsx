"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InvoiceUploader } from "@/components/ledger/InvoiceUploader";
import { extractInvoiceData } from "@/actions/ai";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { toast } from "sonner";

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
  journal_entry_id?: string | null;
  created_at: string;
};

type LedgerAccountOption = {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  fund: string;
};

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

export function InvoiceReview({
  invoices,
  strataId,
  canProcess,
  accounts,
}: {
  invoices: InvoiceRecord[];
  strataId: string;
  canProcess: boolean;
  accounts: LedgerAccountOption[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewInvoice, setReviewInvoice] = useState<InvoiceRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({
    vendor: "",
    invoice_number: "",
    invoice_date: "",
    due_date: "",
    subtotal: "",
    tax: "",
    total: "",
    suggested_account_code: "",
    suggested_fund: "operating",
  });
  const [creditAccountId, setCreditAccountId] = useState("");

  async function analyzeInvoice(invoiceId: string) {
    setBusy(true);
    setMessage("");
    try {
      const result = await extractInvoiceData(invoiceId);
      if (!result.success) {
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

  function creditAccountsForFund(fund: string) {
    const pool =
      fund === "other"
        ? accounts
        : accounts.filter((account) => account.fund === fund);
    return pool.filter((account) =>
      ["asset", "liability"].includes(account.account_type),
    );
  }

  async function openReviewPanel(invoice: InvoiceRecord) {
    setReviewInvoice(invoice);
    const fund = invoice.suggested_fund ?? "operating";
    const credits = creditAccountsForFund(fund);
    setCreditAccountId(credits[0]?.id ?? accounts[0]?.id ?? "");
    setReviewForm({
      vendor: invoice.vendor ?? "",
      invoice_number: invoice.invoice_number ?? "",
      invoice_date: invoice.invoice_date ?? "",
      due_date: invoice.due_date ?? "",
      subtotal: invoice.subtotal !== null ? String(invoice.subtotal) : "",
      tax: invoice.tax !== null ? String(invoice.tax) : "",
      total: invoice.total !== null ? String(invoice.total) : "",
      suggested_account_code: invoice.suggested_account_code ?? "",
      suggested_fund: invoice.suggested_fund ?? "operating",
    });
    setPreviewUrl(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.storage
      .from("strata-invoices")
      .createSignedUrl(invoice.storage_path, 300);
    if (!error && data) {
      setPreviewUrl(data.signedUrl);
    }
  }

  function closeReviewPanel() {
    setReviewInvoice(null);
    setPreviewUrl(null);
  }

  async function saveApprovedReview() {
    if (!reviewInvoice || !canProcess) return;
    setBusy(true);
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("invoices")
      .update({
        vendor: reviewForm.vendor.trim() || null,
        invoice_number: reviewForm.invoice_number.trim() || null,
        invoice_date: reviewForm.invoice_date || null,
        due_date: reviewForm.due_date || null,
        subtotal: reviewForm.subtotal ? Number(reviewForm.subtotal) : null,
        tax: reviewForm.tax ? Number(reviewForm.tax) : null,
        total: reviewForm.total ? Number(reviewForm.total) : null,
        suggested_account_code: reviewForm.suggested_account_code.trim() || null,
        suggested_fund: reviewForm.suggested_fund || null,
        status: "approved",
      })
      .eq("id", reviewInvoice.id)
      .eq("strata_id", strataId);

    setBusy(false);
    if (error) {
      setMessage("The invoice review could not be saved.");
      return;
    }
    setMessage("Invoice approved for posting. Use journal entries to record it in the ledger.");
    closeReviewPanel();
    router.refresh();
  }

  async function postToLedger(invoiceId: string) {
    if (!creditAccountId) {
      setMessage("Choose the credit account (bank or accounts payable).");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/invoices/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, creditAccountId }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Invoice could not be posted.");
        toast.error(result.error ?? "Failed to post the invoice. Please try again.");
        return;
      }
      setMessage("Invoice posted to the ledger.");
      toast.success("Invoice successfully approved and posted to ledger.");
      closeReviewPanel();
      router.refresh();
    } catch {
      setMessage("Invoice could not be posted. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 space-y-5">
      <header>
        <h2 className="font-serif text-xl text-navy-950">
          Invoice OCR · council review
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-500">
          Upload a PDF or photo. The scan fills vendor, date, amount, and account.
          Review those fields against the original before approving. Nothing is posted
          to the ledger until you choose Post to ledger.
        </p>
      </header>

      {canProcess ? (
        <InvoiceUploader
          strataId={strataId}
          accounts={accounts}
          onSaved={(notice) => {
            setMessage(notice);
            router.refresh();
          }}
        />
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
                    {canProcess && invoice.status === "approved" ? (
                      <button
                        type="button"
                        onClick={() => void openReviewPanel(invoice)}
                        className="rounded-lg bg-pine-700 px-3 py-2 text-sm font-semibold text-white hover:bg-pine-600"
                      >
                        Post to ledger
                      </button>
                    ) : null}
                  </div>
                </div>
                {invoice.status === "posted" ? (
                  <p className="text-xs text-pine-800">
                    Posted to journal
                    {invoice.journal_entry_id
                      ? ` · ${invoice.journal_entry_id.slice(0, 8)}…`
                      : ""}
                  </p>
                ) : null}
                {invoice.status === "review_required" ? (
                  <div className="rounded-lg bg-stone-50 p-4 text-sm">
                    {canProcess ? (
                      <button
                        type="button"
                        onClick={() => void openReviewPanel(invoice)}
                        className="mb-3 rounded-lg bg-pine-700 px-3 py-2 text-sm font-semibold text-white hover:bg-pine-600"
                      >
                        Review in split view
                      </button>
                    ) : null}
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
                {invoice.status === "approved" ? (
                  <p className="text-xs text-ink-500">
                    Approved — ready to post as a balanced journal entry.
                  </p>
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

      {reviewInvoice ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/40 p-0 sm:p-4">
          <div className="flex max-h-full flex-1 flex-col overflow-hidden bg-white shadow-2xl sm:mx-auto sm:my-auto sm:max-h-[90vh] sm:w-full sm:max-w-6xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-pine-700">
                  Treasurer review
                </p>
                <h3 className="font-serif text-lg text-navy-950">
                  {reviewInvoice.file_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeReviewPanel}
                className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-navy-900"
              >
                Close
              </button>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
              <div className="min-h-64 border-b border-stone-200 bg-stone-100 lg:border-b-0 lg:border-r">
                {previewUrl ? (
                  reviewInvoice.file_name.toLowerCase().endsWith(".pdf") ? (
                    <iframe
                      title="Invoice preview"
                      src={previewUrl}
                      className="h-full min-h-64 w-full"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="Uploaded invoice"
                      className="mx-auto max-h-[70vh] w-full object-contain p-4"
                    />
                  )
                ) : (
                  <p className="p-6 text-sm text-ink-500">Loading preview…</p>
                )}
              </div>
              <div className="overflow-y-auto p-4 sm:p-6">
                <p className="text-sm text-ink-500">
                  {reviewInvoice.status === "approved"
                    ? "Choose the credit side (typically operating bank or accounts payable), then post."
                    : "Confirm OCR fields against the original, then approve to unlock posting."}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["vendor", "Vendor"],
                      ["invoice_number", "Invoice number"],
                      ["invoice_date", "Invoice date"],
                      ["due_date", "Due date"],
                      ["subtotal", "Subtotal (CAD)"],
                      ["tax", "Tax (CAD)"],
                      ["total", "Total (CAD)"],
                      ["suggested_account_code", "Account code"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="text-sm font-medium text-ink-700">
                      {label}
                      <input
                        type={key.includes("date") ? "date" : "text"}
                        value={reviewForm[key]}
                        onChange={(event) =>
                          setReviewForm((current) => ({
                            ...current,
                            [key]: event.target.value,
                          }))
                        }
                        className="mt-1.5 block w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                      />
                    </label>
                  ))}
                  <label className="text-sm font-medium text-ink-700">
                    Fund
                    <select
                      value={reviewForm.suggested_fund}
                      onChange={(event) =>
                        setReviewForm((current) => ({
                          ...current,
                          suggested_fund: event.target.value,
                        }))
                      }
                      className="mt-1.5 block w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                    >
                      <option value="operating">Operating</option>
                      <option value="contingency">Contingency reserve (CRF)</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                </div>
                {canProcess && reviewInvoice.status !== "approved" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveApprovedReview()}
                    className="mt-6 w-full rounded-lg bg-navy-900 px-4 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-70"
                  >
                    {busy ? "Saving…" : "Approve extracted fields"}
                  </button>
                ) : null}
                {canProcess && reviewInvoice.status === "approved" ? (
                  <div className="mt-6 space-y-4">
                    <label className="block text-sm font-medium text-ink-700">
                      Credit account (bank / payable)
                      <select
                        value={creditAccountId}
                        onChange={(event) => setCreditAccountId(event.target.value)}
                        className="mt-1.5 block w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                      >
                        {creditAccountsForFund(reviewForm.suggested_fund).map(
                          (account) => (
                            <option key={account.id} value={account.id}>
                              {account.account_code} · {account.account_name} (
                              {account.fund})
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={busy || !creditAccountId}
                      onClick={() => void postToLedger(reviewInvoice.id)}
                      className="w-full rounded-lg bg-pine-700 px-4 py-3 text-sm font-semibold text-white hover:bg-pine-600 disabled:opacity-70"
                    >
                      {busy ? "Posting…" : "Post to ledger"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
