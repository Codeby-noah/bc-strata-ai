export type DocumentPage = {
  pageNumber: number | null;
  text: string;
};

export type DocumentChunk = DocumentPage & {
  chunkIndex: number;
  section: string | null;
};

function getSectionHeading(line: string) {
  const trimmed = line.trim();
  if (trimmed.length > 160) {
    return null;
  }
  const match =
    /^(?:(?:section|article|part|division|schedule|appendix)\s+[a-z0-9]+(?:[.-][a-z0-9]+)*|(?:\d+\.)+\d+)(?:\s*[:.)-]?\s+.+)?$/i.exec(
      trimmed,
    );
  return match ? trimmed : null;
}

export function chunkDocumentPages(
  pages: DocumentPage[],
  maxCharacters = 1200,
  overlapCharacters = 160,
): DocumentChunk[] {
  if (
    !Number.isInteger(maxCharacters) ||
    !Number.isInteger(overlapCharacters) ||
    maxCharacters < 200 ||
    overlapCharacters < 0 ||
    overlapCharacters >= maxCharacters
  ) {
    throw new Error("Document chunk size settings are invalid.");
  }

  const chunks: DocumentChunk[] = [];
  for (const page of pages) {
    const blocks: Array<{ section: string | null; text: string }> = [];
    let activeSection: string | null = null;
    let activeLines: string[] = [];

    for (const line of page.text.split(/\r?\n/)) {
      const heading = getSectionHeading(line);
      if (heading && activeLines.join(" ").trim()) {
        blocks.push({ section: activeSection, text: activeLines.join(" ") });
        activeLines = [];
      }
      if (heading) {
        activeSection = heading;
      }
      if (line.trim()) {
        activeLines.push(line.trim());
      }
    }
    if (activeLines.length) {
      blocks.push({ section: activeSection, text: activeLines.join(" ") });
    }

    for (const block of blocks) {
      const text = block.text.replace(/\s+/g, " ").trim();
      let start = 0;

      while (start < text.length) {
        let end = Math.min(start + maxCharacters, text.length);
        if (end < text.length) {
          const boundary = text.lastIndexOf(" ", end);
          if (boundary > start + Math.floor(maxCharacters / 2)) {
            end = boundary;
          }
        }

        const content = text.slice(start, end).trim();
        if (content) {
          chunks.push({
            chunkIndex: chunks.length,
            pageNumber: page.pageNumber,
            section: block.section,
            text: content,
          });
        }
        if (end >= text.length) {
          break;
        }
        start = Math.max(start + 1, end - overlapCharacters);
      }
    }
  }

  return chunks;
}

export async function extractPdfPages(buffer: ArrayBuffer): Promise<DocumentPage[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });
  try {
    const document = await loadingTask.promise;
    if (document.numPages > 500) {
      throw new Error("PDF is too long to index (maximum 500 pages).");
    }

    const pages: DocumentPage[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const textParts: string[] = [];
      let previousY: number | null = null;
      for (const item of content.items) {
        if (!("str" in item) || typeof item.str !== "string") {
          continue;
        }
        const y =
          "transform" in item &&
          Array.isArray(item.transform) &&
          typeof item.transform[5] === "number"
            ? item.transform[5]
            : null;
        if (textParts.length) {
          textParts.push(
            y !== null && previousY !== null && Math.abs(y - previousY) > 2
              ? "\n"
              : " ",
          );
        }
        textParts.push(item.str);
        if (y !== null) {
          previousY = y;
        }
      }
      pages.push({ pageNumber, text: textParts.join("") });
    }
    return pages;
  } finally {
    await loadingTask.destroy();
  }
}
