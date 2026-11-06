import { NextResponse, type NextRequest } from "next/server";
import { createCitedAnswer, createEmbeddings, getOpenAiApiKey } from "@/lib/ai/openai";
import { getStrataContext } from "@/lib/strata/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 60;

type SearchMatch = {
  chunk_id: string;
  document_id: string;
  title: string;
  category: string;
  page_number: number | null;
  section: string | null;
  content: string;
  similarity: number;
};

export async function POST(request: NextRequest) {
  const context = await getStrataContext();
  if (!context?.activeMembership) {
    return NextResponse.json({ error: "Sign in to search this vault." }, { status: 401 });
  }

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
  if (
    typeof question !== "string" ||
    question.trim().length < 3 ||
    question.trim().length > 500
  ) {
    return NextResponse.json(
      { error: "Enter a question between 3 and 500 characters." },
      { status: 400 },
    );
  }

  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        answer:
          "AI Assistant is currently in development mode. API key required for real answers.",
        citations: [],
        developmentMode: true,
      });
    }
    return NextResponse.json(
      { error: "AI search is unavailable until a server-side OpenAI key is configured." },
      { status: 503 },
    );
  }

  let queryEmbedding: number[];
  try {
    [queryEmbedding] = await createEmbeddings(apiKey, [question.trim()]);
  } catch {
    return NextResponse.json(
      { error: "AI search could not create a query. Try again shortly." },
      { status: 502 },
    );
  }
  const supabase = await createSupabaseServerClient({ writeCookies: true });
  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: JSON.stringify(queryEmbedding),
    target_strata_id: context.activeMembership.id,
    minimum_similarity: 0.12,
    result_limit: 8,
  });

  if (error) {
    return NextResponse.json(
      { error: "Document search is not ready. Apply the prepared Supabase migration first." },
      { status: 503 },
    );
  }

  const matches = (data ?? []) as SearchMatch[];
  if (matches.length === 0) {
    return NextResponse.json({
      answer: "I couldn't find supporting information in this strata's indexed documents.",
      citations: [],
    });
  }

  const sources = matches.map((match, index) => ({
    reference: `C${index + 1}`,
    text:
      `C${index + 1}\nDocument: ${match.title}\nCategory: ${match.category}\n` +
      `Page: ${match.page_number ?? "not paginated"}\n` +
      `Section: ${match.section ?? "not identified"}\nExcerpt: ${match.content}`,
  }));
  let response: { answer: string; citations: string[] };
  try {
    response = await createCitedAnswer(apiKey, question.trim(), sources);
  } catch {
    return NextResponse.json(
      { error: "AI search could not produce a cited answer. Try again shortly." },
      { status: 502 },
    );
  }
  if (response.citations.length === 0) {
    return NextResponse.json({
      answer:
        "I couldn't produce a source-backed answer from the indexed documents. Check the original records or try a more specific question.",
      citations: [],
    });
  }
  const citations = response.citations
    .filter((reference, index, references) => references.indexOf(reference) === index)
    .map((reference) => {
      const match = /^C(\d+)$/.exec(reference);
      const index = match ? Number(match[1]) - 1 : -1;
      const source = matches[index];
      return source
        ? {
            documentId: source.document_id,
            title: source.title,
            category: source.category,
            pageNumber: source.page_number,
            section: source.section,
            excerpt: source.content,
          }
        : null;
    })
    .filter((citation) => citation !== null);

  return NextResponse.json({ answer: response.answer, citations });
}
