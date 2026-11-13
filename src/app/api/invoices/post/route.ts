import { NextResponse } from "next/server";
import { getStrataContext } from "@/lib/strata/context";
import { paidWorkspaceResponse } from "@/lib/strata/subscription";
import { canManageFinance } from "@/lib/strata/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const postInvoiceSchema = z.object({
  invoiceId: z.uuid(),
  creditAccountId: z.uuid(),
});

export async function POST(request: Request) {
  const context = await getStrataContext();
  if (!context?.activeMembership) {
    return NextResponse.json({ error: "Sign in to post invoices." }, { status: 401 });
  }
  if (!canManageFinance(context.activeMembership.role)) {
    return NextResponse.json(
      { error: "Finance access is required to post invoices." },
      { status: 403 },
    );
  }
  const subscription = await paidWorkspaceResponse(context.activeMembership.id);
  if (subscription) return subscription;

  const body: unknown = await request.json().catch(() => null);
  const parsed = postInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Choose a valid invoice and credit account." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient({ writeCookies: true });
  const strataId = context.activeMembership.id;
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select(
      "id, status, vendor, invoice_number, invoice_date, total, suggested_account_code, suggested_fund, journal_entry_id",
    )
    .eq("id", parsed.data.invoiceId)
    .eq("strata_id", strataId)
    .maybeSingle();

  if (invoiceError || !invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }
  if (invoice.status !== "approved") {
    return NextResponse.json(
      { error: "Only approved invoices can be posted to the ledger." },
      { status: 409 },
    );
  }
  if (invoice.journal_entry_id) {
    return NextResponse.json(
      { error: "This invoice has already been posted." },
      { status: 409 },
    );
  }

  const amount = Number(invoice.total);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "Set a valid invoice total before posting." },
      { status: 400 },
    );
  }

  const expenseCode = invoice.suggested_account_code?.trim();
  if (!expenseCode) {
    return NextResponse.json(
      { error: "Set a suggested expense account code before posting." },
      { status: 400 },
    );
  }

  const fund = invoice.suggested_fund ?? "operating";
  let expenseQuery = supabase
    .from("ledger_accounts")
    .select("id")
    .eq("strata_id", strataId)
    .eq("account_code", expenseCode)
    .eq("is_active", true);
  if (fund !== "other") {
    expenseQuery = expenseQuery.eq("fund", fund);
  }
  const { data: expenseAccount, error: expenseError } =
    await expenseQuery.maybeSingle();
  if (expenseError || !expenseAccount) {
    return NextResponse.json(
      {
        error: `No active ledger account matches code ${expenseCode} for the ${fund} fund.`,
      },
      { status: 400 },
    );
  }

  const { data: creditAccount, error: creditError } = await supabase
    .from("ledger_accounts")
    .select("id, fund")
    .eq("strata_id", strataId)
    .eq("id", parsed.data.creditAccountId)
    .eq("is_active", true)
    .maybeSingle();
  if (creditError || !creditAccount) {
    return NextResponse.json(
      { error: "Choose an active credit account for this strata." },
      { status: 400 },
    );
  }
  if (fund !== "other" && creditAccount.fund !== fund) {
    return NextResponse.json(
      { error: "Credit account must use the same fund as the expense line." },
      { status: 400 },
    );
  }

  const vendorLabel = invoice.vendor?.trim() || "Vendor invoice";
  const reference = invoice.invoice_number?.trim()
    ? `Invoice ${invoice.invoice_number.trim()}`
    : `Invoice ${invoice.id.slice(0, 8)}`;
  const entryDate =
    typeof invoice.invoice_date === "string" && invoice.invoice_date.length >= 10
      ? invoice.invoice_date.slice(0, 10)
      : new Date().toISOString().slice(0, 10);

  const { data: journalEntryId, error: journalError } = await supabase.rpc(
    "create_journal_entry",
    {
      p_strata_id: strataId,
      p_entry_date: entryDate,
      p_reference: reference,
      p_description: `${vendorLabel} · ${reference}`.slice(0, 500),
      p_lines: [
        {
          account_id: expenseAccount.id,
          debit: amount,
          credit: 0,
          memo: "Invoice expense",
        },
        {
          account_id: creditAccount.id,
          debit: 0,
          credit: amount,
          memo: "Invoice payment / payable",
        },
      ],
    },
  );

  if (journalError || !journalEntryId) {
    return NextResponse.json(
      { error: "The journal entry could not be posted. Check account balances and try again." },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      status: "posted",
      journal_entry_id: journalEntryId,
      reviewed_by: context.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoice.id)
    .eq("strata_id", strataId)
    .eq("status", "approved");

  if (updateError) {
    return NextResponse.json(
      {
        error:
          "The ledger entry was created but the invoice could not be marked posted. Contact support.",
        journalEntryId,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { saved: true, journalEntryId },
    { status: 201 },
  );
}
