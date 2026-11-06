import { NextResponse, type NextRequest } from "next/server";
import {
  extractInvoiceWithVision,
  getOpenAiApiKey,
  type InvoiceExtraction,
} from "@/lib/ai/openai";
import { getStrataContext } from "@/lib/strata/context";
import { canManageFinance } from "@/lib/strata/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 120;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validDate = (value: string | null) =>
  value !== null &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const safeAmount = (value: number | null) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 100_000_000
    ? Math.round(value * 100) / 100
    : null;
const safeText = (value: string | null, maximum: number) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, maximum)
    : null;

export async function POST(request: NextRequest) {
  const context = await getStrataContext();
  if (!context?.activeMembership) {
    return NextResponse.json({ error: "Sign in to process this invoice." }, { status: 401 });
  }
  if (!canManageFinance(context.activeMembership.role)) {
    return NextResponse.json(
      { error: "Finance access is required to process invoices." },
      { status: 403 },
    );
  }

  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Invoice OCR is unavailable until a server-side OpenAI key is configured." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("invoiceId" in body) ||
    typeof body.invoiceId !== "string" ||
    !uuidPattern.test(body.invoiceId)
  ) {
    return NextResponse.json({ error: "Choose a valid invoice." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient({ writeCookies: true });
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, strata_id, storage_path, file_name, mime_type, status")
    .eq("id", body.invoiceId)
    .eq("strata_id", context.activeMembership.id)
    .maybeSingle();

  if (invoiceError) {
    return NextResponse.json({ error: "Unable to load the invoice." }, { status: 500 });
  }
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }
  if (!["uploaded", "review_required"].includes(invoice.status)) {
    return NextResponse.json(
      { error: "Approved or posted invoices cannot be reprocessed." },
      { status: 409 },
    );
  }

  const [{ data: file, error: fileError }, { data: accounts, error: accountsError }] =
    await Promise.all([
      supabase.storage.from("strata-invoices").download(invoice.storage_path),
      supabase
        .from("ledger_accounts")
        .select("account_code, account_name, fund")
        .eq("strata_id", invoice.strata_id)
        .eq("is_active", true),
    ]);

  if (fileError || !file) {
    return NextResponse.json({ error: "Unable to read the private invoice file." }, { status: 502 });
  }
  if (accountsError) {
    return NextResponse.json({ error: "Unable to load the strata chart of accounts." }, { status: 500 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  let extraction: InvoiceExtraction;
  try {
    extraction = await extractInvoiceWithVision(
      apiKey,
      invoice.file_name,
      invoice.mime_type,
      base64,
      (accounts ?? []).map((account) => ({
        code: account.account_code,
        name: account.account_name,
        fund: account.fund,
      })),
    );
  } catch {
    return NextResponse.json(
      { error: "Invoice extraction failed. Check the file and try again." },
      { status: 502 },
    );
  }

  const validAccountCodes = new Set((accounts ?? []).map((account) => account.account_code));
  const normalized: InvoiceExtraction = {
    vendor: safeText(extraction.vendor, 200),
    invoice_number: safeText(extraction.invoice_number, 100),
    invoice_date: validDate(extraction.invoice_date) ? extraction.invoice_date : null,
    due_date: validDate(extraction.due_date) ? extraction.due_date : null,
    subtotal: safeAmount(extraction.subtotal),
    tax: safeAmount(extraction.tax),
    total: safeAmount(extraction.total),
    suggested_account_code:
      typeof extraction.suggested_account_code === "string" &&
      validAccountCodes.has(extraction.suggested_account_code)
        ? extraction.suggested_account_code
        : null,
    suggested_fund: ["operating", "contingency", "other"].includes(
      extraction.suggested_fund ?? "",
    )
      ? extraction.suggested_fund
      : null,
    confidence: ["high", "medium", "low"].includes(extraction.confidence)
      ? extraction.confidence
      : "low",
    notes: Array.isArray(extraction.notes)
      ? extraction.notes
          .filter((note): note is string => typeof note === "string")
          .slice(0, 10)
          .map((note) => note.slice(0, 300))
      : ["Some fields could not be verified."],
  };

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      ...normalized,
      extraction: normalized,
      extraction_model: "gpt-4.1-mini",
      status: "review_required",
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoice.id)
    .eq("strata_id", invoice.strata_id);

  if (updateError) {
    return NextResponse.json(
      { error: "The extraction could not be saved for council review." },
      { status: 500 },
    );
  }

  return NextResponse.json(normalized);
}
