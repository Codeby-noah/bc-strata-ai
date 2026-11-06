import { NextResponse } from "next/server";
import { getStrataContext } from "@/lib/strata/context";
import { canManageExemptions } from "@/lib/strata/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type Account = { id: string; account_type: string };
type JournalLine = {
  account_id: string;
  debit: number | string;
  credit: number | string;
};

async function getContingencyBalance(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  strataId: string,
) {
  const { data: accounts, error: accountError } = await supabase
    .from("ledger_accounts")
    .select("id, account_type")
    .eq("strata_id", strataId)
    .eq("fund", "contingency");
  if (accountError) throw new Error("Unable to load contingency reserve accounts.");
  if (!accounts?.length) return null;

  const accountById = new Map(
    (accounts as Account[]).map((account) => [account.id, account]),
  );
  const totals = new Map<string, number>();
  const pageSize = 500;
  const maximumEntries = 10_000;

  for (let offset = 0; offset < maximumEntries; offset += pageSize) {
    const { data: entries, error: entryError } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("strata_id", strataId)
      .order("entry_date", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (entryError) throw new Error("Unable to read journal history.");
    if (!entries?.length) break;

    const entryIds = entries.map((entry) => entry.id);
    const { data: lines, error: linesError } = await supabase
      .from("journal_lines")
      .select("account_id, debit, credit")
      .eq("strata_id", strataId)
      .in("journal_entry_id", entryIds)
      .in("account_id", [...accountById.keys()]);
    if (linesError) throw new Error("Unable to calculate the contingency reserve balance.");

    for (const line of (lines ?? []) as JournalLine[]) {
      const account = accountById.get(line.account_id);
      if (!account) continue;
      const debit = Number(line.debit);
      const credit = Number(line.credit);
      const movement =
        account.account_type === "asset" || account.account_type === "expense"
          ? debit - credit
          : credit - debit;
      totals.set(line.account_id, (totals.get(line.account_id) ?? 0) + movement);
    }

    if (entries.length < pageSize) break;
    if (offset + pageSize >= maximumEntries) {
      throw new Error("Journal history is too large to calculate safely in one request.");
    }
  }

  return [...totals.values()].reduce((sum, balance) => sum + balance, 0);
}

export async function POST(request: Request) {
  const context = await getStrataContext();
  if (!context) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  const strata = context.activeMembership;
  if (!strata || !canManageExemptions(strata.role)) {
    return NextResponse.json({ error: "Council access is required." }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body) || typeof body.requestId !== "string") {
    return NextResponse.json({ error: "Choose a valid form request." }, { status: 400 });
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)) {
    return NextResponse.json({ error: "Choose a valid form request." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: formRequest, error: requestError } = await supabase
    .from("form_requests")
    .select("id, unit_number, form_type, requested_by, amount_due, status, created_at")
    .eq("id", body.requestId)
    .eq("strata_id", strata.id)
    .maybeSingle();
  if (requestError) {
    return NextResponse.json({ error: "Unable to load the form request." }, { status: 500 });
  }
  if (!formRequest) {
    return NextResponse.json({ error: "Form request not found." }, { status: 404 });
  }

  try {
    const [crfBalance, documentsResult, parkingResult] = await Promise.all([
      getContingencyBalance(supabase, strata.id),
      supabase
        .from("documents")
        .select("id, title")
        .eq("strata_id", strata.id)
        .eq("category", "bylaws")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("parking_assets")
        .select("unit_number, stall_number, asset_type")
        .eq("strata_id", strata.id)
        .eq("unit_number", formRequest.unit_number)
        .order("stall_number", { ascending: true })
        .limit(100),
    ]);

    if (documentsResult.error || parkingResult.error) {
      return NextResponse.json(
        { error: "Unable to load strata records for the preview." },
        { status: 500 },
      );
    }
    const bylaws = documentsResult.data ?? [];
    let bylawExcerpts: Array<{
      document_id: string;
      title: string;
      page_number: number | null;
      section: string | null;
      content: string;
    }> = [];
    if (bylaws.length) {
      const { data: chunks, error: chunksError } = await supabase
        .from("document_chunks")
        .select("document_id, page_number, section, content")
        .eq("strata_id", strata.id)
        .in("document_id", bylaws.map((bylaw) => bylaw.id))
        .order("chunk_index", { ascending: true })
        .limit(5);
      if (chunksError) {
        return NextResponse.json(
          { error: "Unable to load indexed bylaw excerpts." },
          { status: 500 },
        );
      }
      const titles = new Map(bylaws.map((bylaw) => [bylaw.id, bylaw.title]));
      bylawExcerpts = (chunks ?? []).map((chunk) => ({
        ...chunk,
        title: titles.get(chunk.document_id) ?? "Strata bylaw",
      }));
    }

    return NextResponse.json({
      formRequest,
      strata: { name: strata.name, strataNumber: strata.strataNumber },
      crfBalance,
      parking: parkingResult.data ?? [],
      bylawExcerpts,
      notices: [
        "Active lawsuits require manual council confirmation; this app does not maintain a lawsuit register.",
        "This is an internal draft preview only, not an official Form B or Form F. Confirm all facts, payment, and statutory requirements before issuance.",
      ],
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to prepare a safe preview from the available financial records." },
      { status: 500 },
    );
  }
}
