"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Loader2, Send } from "lucide-react";
import { queryBylaws } from "@/actions/ai";
import {
  VaultCitationDrawer,
  citationChipLabel,
  type VaultCitation,
} from "@/components/vault/VaultCitationDrawer";

type ChatMessage = {
  id: string;
  role: "user" | "ai";
  content: string;
  citations?: VaultCitation[];
};

export function ChatInterface({
  onOpenDocument,
}: {
  onOpenDocument: (documentId: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCitation, setActiveCitation] = useState<VaultCitation | null>(null);

  async function handleAskQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = prompt.trim();
    if (question.length < 3 || isLoading) return;

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: question },
    ]);
    setPrompt("");
    setIsLoading(true);

    try {
      const result = await queryBylaws(question);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "ai",
          content: result.success
            ? result.data?.answer ?? "No answer was returned."
            : result.error ?? "Sorry, I ran into an error searching the vault.",
          citations: result.success ? result.data?.citations ?? [] : [],
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "ai",
          content: "Sorry, I ran into an error searching the vault.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="flex h-[32rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:h-[600px]">
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-800">Smart Rulebook</h3>
          <p className="text-xs text-slate-500">
            Ask questions about your uploaded bylaws and minutes. Tap a citation to read the source.
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
          {messages.length === 0 ? (
            <div className="mt-16 text-center text-sm text-slate-400 sm:mt-20">
              No questions asked yet. Try asking about pet restrictions or parking rules.
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 text-sm ${
                    message.role === "user"
                      ? "rounded-br-none bg-slate-900 text-white"
                      : "rounded-bl-none bg-slate-100 leading-relaxed text-slate-800"
                  }`}
                >
                  {message.role === "ai" ? (
                    <AnswerWithCitations
                      text={message.content}
                      citations={message.citations ?? []}
                      onSelect={setActiveCitation}
                    />
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-lg rounded-bl-none bg-slate-100 p-3">
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                <span className="text-sm text-slate-500">Searching vault...</span>
              </div>
            </div>
          ) : null}
        </div>

        <form onSubmit={(event) => void handleAskQuestion(event)} className="border-t border-slate-200 bg-white p-4">
          <div className="relative">
            <label htmlFor="rulebook-question" className="sr-only">
              Ask about your strata bylaws
            </label>
            <input
              id="rulebook-question"
              type="text"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask about your strata bylaws..."
              maxLength={500}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 py-3 pl-4 pr-12 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={prompt.trim().length < 3 || isLoading}
              aria-label="Send question"
              className="absolute right-2 top-2 rounded-md bg-slate-900 p-1.5 text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      <VaultCitationDrawer
        citation={activeCitation}
        onClose={() => setActiveCitation(null)}
        onOpenDocument={onOpenDocument}
      />
    </>
  );
}

function AnswerWithCitations({
  text,
  citations,
  onSelect,
}: {
  text: string;
  citations: VaultCitation[];
  onSelect: (citation: VaultCitation) => void;
}) {
  const parts = text.split(/\[(C\d+)\]/g);
  const used = new Set<number>();
  const rendered: ReactNode[] = parts.map((part, index) => {
    if (index % 2 === 0) {
      return <span key={`text-${index}`}>{part}</span>;
    }
    const citationIndex = Number(part.slice(1)) - 1;
    const citation = citations[citationIndex];
    if (!citation) {
      return <span key={`missing-${index}`}>[{part}]</span>;
    }
    used.add(citationIndex);
    return (
      <CitationChip
        key={`cite-${index}`}
        citation={citation}
        onSelect={onSelect}
      />
    );
  });

  const unused = citations.filter((_, index) => !used.has(index));

  return (
    <div>
      <p className="whitespace-pre-wrap">{rendered}</p>
      {unused.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {unused.map((citation, index) => (
            <CitationChip
              key={`${citation.documentId}-${citation.pageNumber ?? index}`}
              citation={citation}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CitationChip({
  citation,
  onSelect,
}: {
  citation: VaultCitation;
  onSelect: (citation: VaultCitation) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(citation)}
      className="mx-1 inline-flex cursor-pointer items-center rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-200"
    >
      {citationChipLabel(citation)}
    </button>
  );
}
