import { NextResponse, type NextRequest } from "next/server";
import { runInvoiceExtraction } from "@/lib/ai/extract-invoice";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const invoiceId =
    typeof body === "object" && body !== null && "invoiceId" in body
      ? body.invoiceId
      : null;
  if (typeof invoiceId !== "string") {
    return NextResponse.json({ error: "Choose a valid invoice." }, { status: 400 });
  }

  const result = await runInvoiceExtraction(invoiceId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
