import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-16 text-center">
      <p className="text-8xl font-semibold tracking-[-0.08em] text-slate-200 sm:text-9xl">
        404
      </p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
        We can&apos;t seem to find the page you&apos;re looking for.
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
        The link may be out of date, or the page may have moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Return Home
      </Link>
    </main>
  );
}
