import { NextResponse } from "next/server";
import { getStrataContext } from "@/lib/strata/context";
import { paidWorkspaceResponse } from "@/lib/strata/subscription";
import { canManageFinance } from "@/lib/strata/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const journalEntrySchema = z
  .object({
    entry_date: z.iso.date(),
    description: z.string().trim().min(1).max(500),
    reference: z.string().max(120).optional(),
    debit_account_id: z.uuid(),
    credit_account_id: z.uuid(),
    amount: z
      .number()
      .positive()
      .refine((amount) => Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001),
  })
  .refine((entry) => entry.debit_account_id !== entry.credit_account_id, {
    path: ["credit_account_id"],
    message: "Debit and credit accounts must be different.",
  });

export async function POST(request: Request) {
  const context = await getStrataContext();
  if (!context) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (
    context.membershipAccessStatus !== "ready" ||
    !context.activeMembership
  ) {
    return NextResponse.json(
      { error: "Your strata workspace is not ready yet." },
      { status: 409 },
    );
  }
  if (!canManageFinance(context.activeMembership.role)) {
    return NextResponse.json(
      { error: "Finance access is required to post journal entries." },
      { status: 403 },
    );
  }
  const subscription = await paidWorkspaceResponse(context.activeMembership.id);
  if (subscription) return subscription;

  const body: unknown = await request.json().catch(() => null);
  const parsed = journalEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Check the journal entry fields and try again.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }
  const entry = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_journal_entry", {
    p_strata_id: context.activeMembership.id,
    p_entry_date: entry.entry_date,
    p_reference: entry.reference?.trim() ?? "",
    p_description: entry.description,
    p_lines: [
      {
        account_id: entry.debit_account_id,
        debit: entry.amount,
        credit: 0,
      },
      {
        account_id: entry.credit_account_id,
        debit: 0,
        credit: entry.amount,
      },
    ],
  });
  if (error || !data) {
    return NextResponse.json(
      {
        error:
          "The entry could not be posted. Confirm both accounts belong to this strata and are active.",
      },
      { status: 400 },
    );
  }
  return NextResponse.json({ saved: true, id: data }, { status: 201 });
}
