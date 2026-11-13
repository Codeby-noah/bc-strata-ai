import "server-only";

import { createCitedAnswer, createEmbeddings, getOpenAiApiKey } from "@/lib/ai/openai";
import { rateLimit } from "@/lib/security/rate-limit";
import { getStrataContext } from "@/lib/strata/context";
import { paidWorkspaceDenial } from "@/lib/strata/subscription";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BylawCitation = {
  documentId: string;
  title: string;
  category: string;
  pageNumber: number | null;
  section: string | null;
  excerpt: string;
};

export type BylawQueryResult = {
  answer: string;
  citations: BylawCitation[];
};

type SearchMatch = {
  document_id: string;
  title: string;
  category: string;
  page_number: number | null;
  section: string | null;
  content: string;
};

export async function runBylawQuery(prompt: string): Promise<
  { ok: true; data: BylawQueryResult } | { ok: false; error: string; status: number }
> {
  const question = prompt.trim();
  if (question.length < 3 || question.length > 500) {
    return { ok: false, error: "Enter a question between 3 and 500 characters.", status: 400 };
  }

  const context = await getStrataContext();
  if (!context?.activeMembership) {
    return { ok: false, error: "Sign in to search this vault.", status: 401 };
  }
  const subscription = await paidWorkspaceDenial(context.activeMembership.id);
  if (subscription) return { ok: false, ...subscription };
  const limit = rateLimit(`documents-search:${context.userId}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return {
      ok: false,
      error: "Too many searches. Wait a moment and try again.",
      status: 429,
    };
  }

  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      return {
        ok: true,
        data: {
          answer:
            "AI Assistant is currently in development mode. API key required for real answers.",
          citations: [],
        },
      };
    }
    return {
      ok: false,
      error: "AI search is unavailable until a server-side OpenAI key is configured.",
      status: 503,
    };
  }

  let queryEmbedding: number[];
  try {
    [queryEmbedding] = await createEmbeddings(apiKey, [question]);
  } catch {
    return { ok: false, error: "AI search could not create a query. Try again shortly.", status: 502 };
  }

  const supabase = await createSupabaseServerClient({ writeCookies: true });
  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: JSON.stringify(queryEmbedding),
    target_strata_id: context.activeMembership.id,
    minimum_similarity: 0.12,
    result_limit: 5,
  });

  if (error) {
    return {
      ok: false,
      error: "Document search is not ready. Apply the prepared Supabase migration first.",
      status: 503,
    };
  }

  const matches = (data ?? []) as SearchMatch[];
  if (matches.length === 0) {
    return {
      ok: true,
      data: {
        answer: "I couldn't find supporting information in this strata's indexed documents.",
        citations: [],
      },
    };
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
    response = await createCitedAnswer(apiKey, question, sources);
  } catch {
    return {
      ok: false,
      error: "AI search could not produce a cited answer. Try again shortly.",
      status: 502,
    };
  }

  if (response.citations.length === 0) {
    return {
      ok: true,
      data: {
        answer:
          "I couldn't produce a source-backed answer from the indexed documents. Check the original records or try a more specific question.",
        citations: [],
      },
    };
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
    .filter((citation): citation is BylawCitation => citation !== null);

  return { ok: true, data: { answer: response.answer, citations } };
}
