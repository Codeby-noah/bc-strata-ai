"use client";

export type VaultCitation = {
  documentId: string;
  title: string;
  category: string;
  pageNumber: number | null;
  section: string | null;
  excerpt: string;
};

type VaultCitationDrawerProps = {
  citation: VaultCitation | null;
  onClose: () => void;
  onOpenDocument?: (documentId: string) => void;
};

export function VaultCitationDrawer({
  citation,
  onClose,
  onOpenDocument,
}: VaultCitationDrawerProps) {
  if (!citation) {
    return null;
  }

  const label = [
    citation.title,
    citation.pageNumber ? `Page ${citation.pageNumber}` : null,
    citation.section,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm"
        aria-label="Close citation panel"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl"
        role="dialog"
        aria-labelledby="citation-drawer-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Source excerpt
            </p>
            <h2
              id="citation-drawer-title"
              className="mt-1 text-base font-semibold leading-snug text-slate-900"
            >
              {label}
            </h2>
            <p className="mt-1 text-xs capitalize text-slate-500">
              {citation.category.replaceAll("_", " ")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
            {citation.excerpt}
          </p>
        </div>
        {onOpenDocument ? (
          <div className="border-t border-gray-100 px-5 py-4">
            <button
              type="button"
              onClick={() => onOpenDocument(citation.documentId)}
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Open full document
            </button>
          </div>
        ) : null}
      </aside>
    </>
  );
}

export function citationChipLabel(citation: VaultCitation) {
  const page = citation.pageNumber ? ` · p. ${citation.pageNumber}` : "";
  const shortTitle =
    citation.title.length > 28 ? `${citation.title.slice(0, 26)}…` : citation.title;
  return `${shortTitle}${page}`;
}
