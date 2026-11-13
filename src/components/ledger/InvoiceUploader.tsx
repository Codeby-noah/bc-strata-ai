"use client";

import { useState, type ChangeEvent } from "react";
import { Check, FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { extractInvoiceData } from "@/actions/ai";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { MAX_UPLOAD_BYTES, maxUploadLabel } from "@/lib/uploads";

type LedgerAccountOption = {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  fund: string;
};

type ExpenseForm = {
  vendor: string;
  total_amount: string;
  date: string;
  suggested_category: string;
  suggested_account_code: string;
  suggested_fund: string;
};

const emptyForm: ExpenseForm = {
  vendor: "",
  total_amount: "",
  date: "",
  suggested_category: "",
  suggested_account_code: "",
  suggested_fund: "operating",
};

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

function safeFileName(fileName: string) {
  const safeName = fileName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(-120);
  return /^\.+$/.test(safeName) ? "" : safeName;
}

function isAllowedFile(file: File) {
  return (
    allowedTypes.has(file.type) || /\.(pdf|png|jpe?g)$/i.test(file.name)
  );
}

export function InvoiceUploader({
  strataId,
  accounts,
  onSaved,
}: {
  strataId: string;
  accounts: LedgerAccountOption[];
  onSaved: (message: string) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ExpenseForm>(emptyForm);

  function resetUploader() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setIsPdf(false);
    setInvoiceId(null);
    setFormData(emptyForm);
    setError("");
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    if (file.size === 0) {
      setError("That file is empty.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`Invoices must be ${maxUploadLabel()} or smaller.`);
      return;
    }
    if (!isAllowedFile(file)) {
      setError("Choose a PNG, JPG, or PDF invoice.");
      return;
    }

    const fileName = safeFileName(file.name);
    if (!fileName) {
      setError("The file name is not supported.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setIsPdf(file.type === "application/pdf" || fileName.toLowerCase().endsWith(".pdf"));
    setIsExtracting(true);
    setFormData(emptyForm);

    const supabase = createSupabaseBrowserClient();
    const nextInvoiceId = crypto.randomUUID();
    const storagePath = `${strataId}/invoices/${nextInvoiceId}/${fileName}`;
    const mimeType = allowedTypes.has(file.type)
      ? file.type
      : fileName.toLowerCase().endsWith(".pdf")
        ? "application/pdf"
        : fileName.toLowerCase().endsWith(".png")
          ? "image/png"
          : "image/jpeg";

    const { error: uploadError } = await supabase.storage
      .from("strata-invoices")
      .upload(storagePath, file, { contentType: mimeType, upsert: false });
    if (uploadError) {
      setIsExtracting(false);
      setError("The invoice could not be uploaded. Check your access and try again.");
      return;
    }

    const { error: recordError } = await supabase.from("invoices").insert({
      id: nextInvoiceId,
      strata_id: strataId,
      storage_path: storagePath,
      file_name: fileName,
      mime_type: mimeType,
      byte_size: file.size,
    });
    if (recordError) {
      await supabase.storage.from("strata-invoices").remove([storagePath]);
      setIsExtracting(false);
      setError("The invoice record could not be saved, so the uploaded file was removed.");
      return;
    }

    setInvoiceId(nextInvoiceId);
    try {
      const result = await extractInvoiceData(nextInvoiceId);
      if (!result.success || !result.data) {
        setError(result.error ?? "The invoice was saved, but scanning failed. You can still enter the fields.");
        return;
      }
      setFormData({
        vendor: result.data.vendor ?? "",
        total_amount:
          result.data.total_amount !== null ? String(result.data.total_amount) : "",
        date: result.data.date ?? "",
        suggested_category: result.data.suggested_category ?? "",
        suggested_account_code: result.data.suggested_account_code ?? "",
        suggested_fund: result.data.suggested_fund ?? "operating",
      });
    } catch {
      setError("The invoice was saved, but scanning failed. You can still enter the fields.");
    } finally {
      setIsExtracting(false);
    }
  }

  async function approveExpense() {
    if (!invoiceId) return;
    const total = Number(formData.total_amount);
    if (!formData.vendor.trim() || !Number.isFinite(total) || total <= 0) {
      setError("Enter a vendor and an amount greater than zero before approving.");
      return;
    }

    setIsSaving(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        vendor: formData.vendor.trim(),
        invoice_date: formData.date || null,
        total,
        suggested_account_code: formData.suggested_account_code || null,
        suggested_fund: formData.suggested_fund || "operating",
        status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .eq("strata_id", strataId);

    setIsSaving(false);
    if (updateError) {
      setError("The expense could not be approved.");
      toast.error("Failed to approve the invoice. Please try again.");
      return;
    }
    toast.success("Invoice approved. Post it from the queue to record it in the ledger.");
    onSaved("Invoice approved. Post it from the queue when you are ready to record the journal entry.");
    resetUploader();
  }

  const fieldClass =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900";

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Record new expense</h3>
          <p className="mt-1 text-sm text-slate-500">
            Upload a contractor invoice. The scan fills the fields, and you confirm them before anything is approved.
          </p>
        </div>
        {previewUrl ? (
          <button
            type="button"
            onClick={resetUploader}
            className="text-sm font-semibold text-slate-600 underline underline-offset-4"
          >
            Start over
          </button>
        ) : null}
      </div>

      {!previewUrl ? (
        <div className="rounded-lg border-2 border-dashed border-slate-300 p-12 text-center transition-colors hover:bg-slate-50">
          <input
            type="file"
            accept="image/png,image/jpeg,application/pdf,.png,.jpg,.jpeg,.pdf"
            onChange={(event) => void handleFileUpload(event)}
            className="hidden"
            id="invoice-upload"
          />
          <label htmlFor="invoice-upload" className="flex cursor-pointer flex-col items-center">
            <Upload className="mb-3 h-8 w-8 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Click to upload invoice</span>
            <span className="mt-1 text-xs text-slate-500">
              PNG, JPG, or PDF up to {maxUploadLabel()}
            </span>
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="relative flex min-h-[400px] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {isExtracting ? (
              <div className="flex flex-col items-center text-slate-500">
                <Loader2 className="mb-2 h-8 w-8 animate-spin" />
                <span className="text-sm font-medium">Scanning invoice...</span>
              </div>
            ) : isPdf ? (
              <iframe title="Invoice preview" src={previewUrl} className="h-full min-h-[400px] w-full bg-white" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Invoice preview" className="h-full max-h-[32rem] w-full object-contain" />
            )}
            {!isExtracting && isPdf ? (
              <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-slate-600">
                <FileText className="h-3.5 w-3.5" />
                PDF
              </span>
            ) : null}
          </div>

          <div className="flex flex-col justify-center space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Vendor</span>
              <input
                type="text"
                value={formData.vendor}
                onChange={(event) => setFormData({ ...formData, vendor: event.target.value })}
                className={fieldClass}
                disabled={isExtracting}
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Date</span>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                  className={fieldClass}
                  disabled={isExtracting}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={(event) =>
                    setFormData({ ...formData, total_amount: event.target.value })
                  }
                  className={fieldClass}
                  disabled={isExtracting}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Category</span>
              <input
                type="text"
                value={formData.suggested_category}
                onChange={(event) =>
                  setFormData({ ...formData, suggested_category: event.target.value })
                }
                className={fieldClass}
                disabled={isExtracting}
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Fund</span>
                <select
                  value={formData.suggested_fund}
                  onChange={(event) =>
                    setFormData({ ...formData, suggested_fund: event.target.value })
                  }
                  className={fieldClass}
                  disabled={isExtracting}
                >
                  <option value="operating">Operating</option>
                  <option value="contingency">CRF</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Account</span>
                <select
                  value={formData.suggested_account_code}
                  onChange={(event) => {
                    const account = accounts.find(
                      (item) => item.account_code === event.target.value,
                    );
                    setFormData({
                      ...formData,
                      suggested_account_code: event.target.value,
                      suggested_category: account?.account_name ?? formData.suggested_category,
                      suggested_fund: account?.fund ?? formData.suggested_fund,
                    });
                  }}
                  className={fieldClass}
                  disabled={isExtracting}
                >
                  <option value="">Select an account</option>
                  {accounts
                    .filter((account) => account.account_type === "expense")
                    .map((account) => (
                      <option key={account.id} value={account.account_code}>
                        {account.account_code} · {account.account_name}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <button
              type="button"
              disabled={isExtracting || isSaving || !invoiceId}
              onClick={() => void approveExpense()}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-slate-800 active:scale-95 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isSaving ? "Saving…" : "Approve expense"}
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
