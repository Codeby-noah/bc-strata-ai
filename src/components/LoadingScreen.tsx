export function LoadingScreen({ message }: { message: string }) {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-12"
      role="status"
      aria-live="polite"
    >
      <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-navy-950">
          <span className="font-serif text-xl text-white">B</span>
        </div>
        <p className="mt-4 font-serif text-2xl tracking-tight text-navy-950">
          BC Strata
        </p>
        <div className="mx-auto mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-stone-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-pine-700" />
        </div>
        <p className="mt-4 text-sm text-ink-500">{message}</p>
      </section>
    </main>
  );
}
