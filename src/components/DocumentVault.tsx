"use client";

import { useRef, useState, type FormEvent, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";

type DocumentRecord = {
  id: string;
  title: string;
  category: string;
  file_name: string;
  storage_path: string;
  byte_size: number;
  indexed_at: string | null;
  created_at: string;
};

const maximumFileSize = 20 * 1024 * 1024;
function safeFileName(fileName: string) {
  const safeName = fileName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(-120);
  return /^\.+$/.test(safeName) ? "" : safeName;
}

export function DocumentVault({
  documents,
  strataId,
  canManageExemptions,
}: {
  documents: DocumentRecord[];
  strataId: string;
  canManageExemptions: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [openingPath, setOpeningPath] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState("other");
  const [aiConsent, setAiConsent] = useState(false);
  const [searchQuestion, setSearchQuestion] = useState("");
  const [searchAnswer, setSearchAnswer] = useState("");
  const [searchCitations, setSearchCitations] = useState<
    Array<{
      documentId: string;
      title: string;
      category: string;
      pageNumber: number | null;
      section: string | null;
      excerpt: string;
    }>
  >([]);
  const [searchBusy, setSearchBusy] = useState(false);

  async function uploadDocument() {
    setMessage("");
    const file = selectedFile;
    if (!file) {
      setMessage("Choose a PDF before uploading.");
      toast.error("Choose a PDF before uploading.");
      return;
    }

    if (file.size === 0) {
      setMessage("That PDF is empty. Choose another file.");
      toast.error("That PDF is empty. Choose another file.");
      return;
    }
    if (file.size > maximumFileSize) {
      setMessage("Files must be 20 MB or smaller.");
      toast.error("Files must be 20 MB or smaller.");
      return;
    }
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      setMessage("Only PDF documents can be uploaded here.");
      toast.error("Only PDF documents can be uploaded here.");
      return;
    }
    const validCategories = [
      "bylaws",
      "minutes",
      "engineering",
      "insurance",
      "financial",
      "other",
      ...(canManageExemptions ? ["exemptions_resolutions"] : []),
    ];
    if (!validCategories.includes(category)) {
      setMessage("Choose a valid document category.");
      toast.error("Choose a valid document category.");
      return;
    }

    const fileName = safeFileName(file.name);
    if (!fileName) {
      setMessage("The file name is not supported.");
      toast.error("The file name is not supported.");
      return;
    }

    setBusy(true);
    setMessage("Uploading your PDF securely…");
    try {
      const supabase = createSupabaseBrowserClient();
      const documentId = crypto.randomUUID();
      const storagePath = `${strataId}/documents/${documentId}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("strata-documents")
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        setMessage("The file could not be uploaded. Check your access and try again.");
        toast.error("The file could not be uploaded.");
        return;
      }

      const { error: recordError } = await supabase.from("documents").insert({
        id: documentId,
        strata_id: strataId,
        title: file.name.replace(/\.pdf$/i, "").slice(0, 120) || "Strata document",
        category,
        file_name: fileName,
        mime_type: file.type,
        byte_size: file.size,
        storage_path: storagePath,
      });

      if (recordError) {
        const { error: cleanupError } = await supabase.storage
          .from("strata-documents")
          .remove([storagePath]);
        setMessage(
          cleanupError
            ? "The record could not be saved and the uploaded file could not be cleaned up. Contact your administrator."
            : "The record could not be saved, so the uploaded file was removed.",
        );
        toast.error("The document record could not be saved.");
        return;
      }

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (aiConsent) {
        try {
          const indexResponse = await fetch("/api/documents/index", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documentId }),
          });
          const result = (await indexResponse.json()) as {
            indexedChunks?: number;
            error?: string;
            message?: string;
            skipped?: boolean;
          };
          if (!indexResponse.ok) {
            setMessage(
              `Document uploaded, but not indexed: ${result.error ?? "Indexing failed."}`,
            );
            toast.error("Document uploaded, but indexing failed.");
          } else if (result.skipped) {
            setMessage(result.message ?? "File uploaded successfully (AI indexing skipped in dev mode).");
            toast.success("Document uploaded successfully. AI indexing was skipped.");
          } else {
            setMessage(`Document uploaded and indexed (${result.indexedChunks} excerpts).`);
            toast.success("Document uploaded and indexed successfully.");
          }
        } catch {
          setMessage("Document uploaded, but indexing could not be completed.");
          toast.error("Document uploaded, but indexing could not be completed.");
        }
      } else {
        setMessage("Document uploaded. AI indexing was skipped.");
        toast.success("Document uploaded successfully.");
      }
      router.refresh();
    } catch {
      setMessage("The document could not be uploaded. Check your connection and try again.");
      toast.error("The document could not be uploaded.");
    } finally {
      setBusy(false);
    }
  }

  async function searchVault(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (searchQuestion.trim().length < 3) {
      setSearchAnswer("Enter a question to search the strata documents.");
      toast.error("Enter a question to search the strata documents.");
      return;
    }

    setSearchBusy(true);
    setSearchAnswer("");
    setSearchCitations([]);
    try {
      const response = await fetch("/api/documents/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: searchQuestion.trim() }),
      });
      const result = (await response.json()) as {
        answer?: string;
        error?: string;
        citations?: typeof searchCitations;
      };
      setSearchAnswer(
        response.ok
          ? result.answer ?? "No answer was returned."
          : result.error ?? "Search could not be completed.",
      );
      setSearchCitations(response.ok ? result.citations ?? [] : []);
      if (!response.ok) toast.error(result.error ?? "Search could not be completed.");
    } catch {
      setSearchAnswer("Search could not be completed. Try again.");
      toast.error("Search could not be completed.");
    } finally {
      setSearchBusy(false);
    }
  }

  async function downloadDocument(storagePath: string) {
    setMessage("");
    setOpeningPath(storagePath);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.storage
        .from("strata-documents")
        .createSignedUrl(storagePath, 60);
      if (error || !data) {
        setMessage("The document could not be opened. Check your access and try again.");
        toast.error("The document could not be opened.");
        return;
      }
      window.location.assign(data.signedUrl);
    } catch {
      setMessage("The document could not be opened. Check your connection and try again.");
      toast.error("The document could not be opened.");
    } finally {
      setOpeningPath(null);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Add a document
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              PDFs are stored in this strata’s private workspace · up to 20 MB
            </p>
          </div>
          <label className="text-sm font-medium text-slate-700">
            Document category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={busy}
              className="mt-1.5 block h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
            >
              <option value="bylaws">Bylaws &amp; rules</option>
              <option value="minutes">AGM / SGM minutes</option>
              <option value="engineering">Engineering reports</option>
              <option value="insurance">Insurance</option>
              <option value="financial">Financial records</option>
              {canManageExemptions ? (
                <option value="exemptions_resolutions">Exemptions &amp; resolutions</option>
              ) : null}
              <option value="other">Other</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          className={`flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-8 text-center transition ${
            dragging
              ? "border-blue-400 bg-blue-50"
              : "border-gray-300 bg-zinc-50 hover:border-blue-300 hover:bg-blue-50/50"
          } ${busy ? "pointer-events-none opacity-60" : ""}`}
          disabled={busy}
          aria-label="Choose a PDF or drop one here"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event: DragEvent<HTMLButtonElement>) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files[0];
            if (file) {
              setSelectedFile(file);
              setMessage("");
            }
          }}
        >
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <UploadIcon />
          </span>
          <span className="text-sm font-semibold text-slate-900">
            {dragging ? "Drop your PDF here" : "Drop a PDF here or browse"}
          </span>
          <span className="mt-1 text-sm text-slate-500">
            {selectedFile
              ? `${selectedFile.name} · ${formatFileSize(selectedFile.size)}`
              : "PDF documents up to 20 MB"}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          disabled={busy}
          className="sr-only"
          onChange={(event) => {
            setSelectedFile(event.currentTarget.files?.[0] ?? null);
            setMessage("");
          }}
        />
        <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
          <input
            type="checkbox"
            checked={aiConsent}
            onChange={(event) => setAiConsent(event.target.checked)}
            disabled={busy}
            className="mt-1 shrink-0 accent-blue-600"
          />
          <span>
            I approve sending this PDF to OpenAI for document indexing and
            answers. Without this consent, it is stored privately and is not
            sent for AI processing.
          </span>
        </label>
        <button
          type="button"
          onClick={() => void uploadDocument()}
          disabled={busy || !selectedFile}
          className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="inline-flex items-center gap-2">
            {busy ? <LoadingSpinner /> : null}
            {busy ? "Uploading…" : "Upload PDF"}
          </span>
        </button>
        {message ? (
          <p className="mt-4 text-sm text-slate-700" role="status">
            {message}
          </p>
        ) : null}
      </section>

      <form
        onSubmit={(event) => void searchVault(event)}
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          Ask this strata’s rulebook
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Answers are based only on indexed documents and include document/page
          citations. AI may be wrong; verify important decisions in the source.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="rulebook-question" className="sr-only">
            Question for the strata rulebook
          </label>
          <input
            id="rulebook-question"
            name="question"
            value={searchQuestion}
            onChange={(event) => setSearchQuestion(event.target.value)}
            minLength={3}
            maxLength={500}
            placeholder="Can a unit keep a dog under an exemption?"
            className="h-11 flex-1 rounded-xl border border-gray-200 bg-zinc-50 px-3 text-sm text-slate-900"
          />
          <button
            type="submit"
            disabled={searchBusy}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-70"
          >
            <span className="inline-flex items-center gap-2">
              {searchBusy ? <LoadingSpinner /> : null}
              {searchBusy ? "Searching…" : "Ask"}
            </span>
          </button>
        </div>
        {searchAnswer ? (
          <div className="mt-5 rounded-xl bg-zinc-50 p-4">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-900">
              {searchAnswer}
            </p>
            {searchCitations.length ? (
              <ul className="mt-4 space-y-3 border-t border-gray-200 pt-3">
                {searchCitations.map((citation) => (
                  <li
                    key={`${citation.documentId}-${citation.pageNumber ?? "na"}`}
                    className="text-xs leading-5 text-slate-500"
                  >
                    <p className="font-semibold text-slate-800">
                      {citation.title}
                      {citation.pageNumber ? ` · Page ${citation.pageNumber}` : ""}
                      {citation.section ? ` · ${citation.section}` : ""}
                    </p>
                    <p className="mt-1">{citation.excerpt}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </form>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Strata documents
          </h2>
        </div>
        <div className="hidden gap-3 border-b border-gray-200 bg-zinc-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-[minmax(0,1fr)_9rem_7rem_5rem]">
          <span>Document name</span>
          <span>Upload date</span>
          <span>File size</span>
          <span className="sr-only">Actions</span>
        </div>
        {documents.length ? (
          <ul className="divide-y divide-stone-100">
            {documents.map((document) => (
              <li
                key={document.id}
                className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_9rem_7rem_5rem] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{document.title}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {document.category.replaceAll("_", " ")} · {document.file_name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {document.indexed_at ? "AI search indexed" : "Not indexed for AI search"}
                  </p>
                </div>
                <p className="text-sm text-slate-500">
                  {new Date(document.created_at).toLocaleDateString("en-CA")}
                </p>
                <p className="text-sm text-slate-500">
                  {formatFileSize(document.byte_size)}
                </p>
                <button
                  type="button"
                  disabled={openingPath === document.storage_path}
                  onClick={() => void downloadDocument(document.storage_path)}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2">
                    {openingPath === document.storage_path ? <LoadingSpinner /> : null}
                    {openingPath === document.storage_path ? "Opening…" : "Open"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-sm text-slate-500">
            No documents have been added to this strata yet.
          </p>
        )}
      </section>
    </div>
  );
}

function formatFileSize(byteSize: number) {
  if (byteSize < 1024 * 1024) {
    return `${Math.max(1, Math.round(byteSize / 1024))} KB`;
  }
  return `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path
        d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15.5v3A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
