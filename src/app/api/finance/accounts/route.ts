import { NextResponse } from "next/server";
import { getStrataContext } from "@/lib/strata/context";
import { canManageFinance } from "@/lib/strata/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const accountTypes = new Set([
  "asset",
  "liability",
  "equity",
  "income",
  "expense",
]);
const funds = new Set(["operating", "contingency", "other"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const context = await getStrataContext();
  if (!context?.activeMembership) {
    return NextResponse.json({ error: "Sign in to manage ledger accounts." }, { status: 401 });
  }
  if (!canManageFinance(context.activeMembership.role)) {
    return NextResponse.json({ error: "Finance access is required." }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (
    !isRecord(body) ||
    typeof body.account_code !== "string" ||
    body.account_code.trim().length < 1 ||
    body.account_code.trim().length > 30 ||
    typeof body.account_name !== "string" ||
    body.account_name.trim().length < 1 ||
    body.account_name.trim().length > 120 ||
    typeof body.account_type !== "string" ||
    !accountTypes.has(body.account_type) ||
    typeof body.fund !== "string" ||
    !funds.has(body.fund)
  ) {
    return NextResponse.json({ error: "Enter valid account details." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient({ writeCookies: true });
  const { error } = await supabase.from("ledger_accounts").insert({
    strata_id: context.activeMembership.id,
    account_code: body.account_code.trim(),
    account_name: body.account_name.trim(),
    account_type: body.account_type,
    fund: body.fund,
  });

  if (error) {
    return NextResponse.json(
      {
        error: error.code === "23505"
          ? "That account code is already in use for this strata."
          : "The account could not be added. Check the details and try again.",
      },
      { status: 400 },
    );
  }
  return NextResponse.json({ saved: true }, { status: 201 });
}
