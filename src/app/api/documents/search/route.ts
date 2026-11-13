import { NextResponse, type NextRequest } from "next/server";
import { runBylawQuery } from "@/lib/ai/query-bylaws";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a search question." }, { status: 400 });
  }

  const question =
    typeof body === "object" && body !== null && "question" in body
      ? body.question
      : null;
  if (typeof question !== "string") {
    return NextResponse.json({ error: "Enter a search question." }, { status: 400 });
  }

  const result = await runBylawQuery(question);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
