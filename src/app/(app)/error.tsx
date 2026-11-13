"use client";

export default function StrataPageError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine-700">
          StrataDock
        </p>
        <h1 className="mt-3 font-serif text-2xl text-navy-950">
          This page couldn’t load
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-500">
          Your account is safe. The workspace may still be setting up, or a
          service may be temporarily unavailable. Try loading the page again.
          If it keeps happening, contact the project owner.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-lg bg-pine-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pine-600"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
