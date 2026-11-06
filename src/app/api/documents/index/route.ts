import { NextResponse, type NextRequest } from "next/server";
import {
  createEmbeddings,
  extractDocumentPagesWithVision,
  getOpenAiApiKey,
} from "@/lib/ai/openai";
import { chunkDocumentPages, extractPdfPages } from "@/lib/documents/text";
import { getStrataContext } from "@/lib/strata/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 120;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const maximumIndexText = 250_000;

export async function POST(request: NextRequest) {
  const context = await getStrataContext();
  if (!context?.activeMembership) {
    return NextResponse.json({ error: "Sign in to index a document." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("documentId" in body) ||
    typeof body.documentId !== "string" ||
    !uuidPattern.test(body.documentId)
  ) {
    return NextResponse.json({ error: "Choose a valid document." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient({ writeCookies: true });
  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, strata_id, uploaded_by, mime_type, storage_path")
    .eq("id", body.documentId)
    .eq("strata_id", context.activeMembership.id)
    .maybeSingle();

  if (documentError) {
    return NextResponse.json({ error: "Unable to load the document." }, { status: 500 });
  }
  if (!document || document.uploaded_by !== context.userId) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }
  if (
    ![
      "application/pdf",
      "text/plain",
      "text/csv",
      "image/jpeg",
      "image/png",
    ].includes(document.mime_type)
  ) {
    return NextResponse.json(
      { error: "AI search indexing supports PDFs, JPG/PNG images, and text files." },
      { status: 415 },
    );
  }

  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        message: "File uploaded successfully (AI indexing skipped in dev mode).",
        skipped: true,
        indexedChunks: 0,
      });
    }
    return NextResponse.json(
      { error: "AI indexing is unavailable until a server-side OpenAI key is configured." },
      { status: 503 },
    );
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from("strata-documents")
    .download(document.storage_path);
  if (downloadError || !file) {
    return NextResponse.json({ error: "Unable to read the private document." }, { status: 502 });
  }

  const buffer = await file.arrayBuffer();
  let pages: Array<{ pageNumber: number | null; text: string }>;
  try {
    if (document.mime_type === "application/pdf") {
      pages = await extractPdfPages(buffer);
    } else if (document.mime_type.startsWith("image/")) {
      pages = [];
    } else {
      pages = [
        {
          pageNumber: null,
          text: new TextDecoder("utf-8", { fatal: true }).decode(buffer),
        },
      ];
    }
  } catch {
    return NextResponse.json(
      { error: "Could not extract readable text from this file." },
      { status: 422 },
    );
  }

  const needsVision =
    document.mime_type.startsWith("image/") ||
    (document.mime_type === "application/pdf" &&
      pages.some((page) => page.text.trim().length === 0));
  if (needsVision) {
    if (document.mime_type === "application/pdf" && pages.length > 15) {
      return NextResponse.json(
        {
          error:
            "Scanned PDFs can be AI-indexed up to 15 pages at a time. Split this file into smaller documents and try again.",
        },
        { status: 413 },
      );
    }
    try {
      pages = await extractDocumentPagesWithVision(
        apiKey,
        document.storage_path.split("/").pop() ?? "document",
        document.mime_type,
        Buffer.from(buffer).toString("base64"),
      );
    } catch {
      return NextResponse.json(
        { error: "Document OCR failed. The private document is still saved; try indexing it again." },
        { status: 502 },
      );
    }
  }

  const totalCharacters = pages.reduce((sum, page) => sum + page.text.length, 0);
  if (totalCharacters > maximumIndexText) {
    return NextResponse.json(
      { error: "This document contains too much text to index (maximum 250,000 characters)." },
      { status: 413 },
    );
  }

  const chunks = chunkDocumentPages(pages);
  if (chunks.length === 0) {
    return NextResponse.json(
      { error: "No selectable text was found. Scanned PDFs need OCR before they can be searched." },
      { status: 422 },
    );
  }
  if (chunks.length > 200) {
    return NextResponse.json(
      { error: "This document is too long to index safely." },
      { status: 413 },
    );
  }

  let embeddings: number[][];
  try {
    embeddings = await createEmbeddings(
      apiKey,
      chunks.map((chunk) => chunk.text),
    );
  } catch {
    return NextResponse.json(
      { error: "AI indexing failed. The private document is still saved; try indexing it again." },
      { status: 502 },
    );
  }

  const { error: clearError } = await supabase
    .from("document_chunks")
    .delete()
    .eq("document_id", document.id)
    .eq("strata_id", document.strata_id);
  if (clearError) {
    return NextResponse.json({ error: "Unable to update the document index." }, { status: 500 });
  }

  const rows = chunks.map((chunk, index) => ({
    strata_id: document.strata_id,
    document_id: document.id,
    chunk_index: chunk.chunkIndex,
    page_number: chunk.pageNumber,
    section: chunk.section,
    content: chunk.text,
    embedding: JSON.stringify(embeddings[index]),
  }));
  const { error: insertError } = await supabase
    .from("document_chunks")
    .insert(rows);

  if (insertError) {
    return NextResponse.json({ error: "Unable to save the document index." }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("documents")
    .update({ indexed_at: new Date().toISOString() })
    .eq("id", document.id)
    .eq("strata_id", document.strata_id);
  if (updateError) {
    return NextResponse.json(
      { error: "Document excerpts were saved, but the index status could not be updated." },
      { status: 500 },
    );
  }

  return NextResponse.json({ indexedChunks: chunks.length });
}
