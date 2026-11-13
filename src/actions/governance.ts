"use server";

import { runBylawQuery } from "@/lib/ai/query-bylaws";

export async function checkCouncilRisk(action: string) {
  const description = action.trim().slice(0, 360);
  const result = await runBylawQuery(
    `What risks do the indexed bylaws or minutes show before council does this? ${description}`,
  );
  if (!result.ok) {
    return { success: false as const, error: result.error };
  }
  const caution =
    result.data.citations.length === 0
      ? `${result.data.answer} Upload the bylaws or Strata Property Act excerpts to the document vault before relying on this review.`
      : result.data.answer;
  return { success: true as const, data: { ...result.data, answer: caution } };
}
