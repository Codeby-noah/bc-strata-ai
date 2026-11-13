"use server";

import { runInvoiceExtraction } from "@/lib/ai/extract-invoice";
import { runBylawQuery } from "@/lib/ai/query-bylaws";

export async function queryBylaws(prompt: string) {
  const result = await runBylawQuery(prompt);
  if (!result.ok) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
}

export async function extractInvoiceData(invoiceId: string) {
  const result = await runInvoiceExtraction(invoiceId);
  if (!result.ok) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
}
