type WorkspaceSkeletonProps = {
  type: "dashboard" | "ledger" | "documents" | "portal";
};

const pulse = "animate-pulse rounded-xl bg-slate-200";

export function WorkspaceSkeleton({ type }: WorkspaceSkeletonProps) {
  if (type === "dashboard") {
    return (
      <main aria-label="Loading dashboard" aria-busy="true" className="space-y-8">
        <div className="space-y-3">
          <div className={`${pulse} h-3 w-24`} />
          <div className={`${pulse} h-9 w-56`} />
          <div className={`${pulse} h-4 w-full max-w-xl`} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className={`${pulse} h-4 w-32`} />
              <div className={`${pulse} mt-5 h-8 w-40`} />
              <div className={`${pulse} mt-3 h-3 w-48`} />
            </div>
          ))}
        </div>
        <SkeletonTable rows={5} />
      </main>
    );
  }

  if (type === "documents") {
    return (
      <main aria-label="Loading document vault" aria-busy="true" className="space-y-6">
        <SkeletonHeader />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className={`${pulse} h-5 w-40`} />
          <div className={`${pulse} mt-5 h-40 w-full rounded-2xl`} />
          <div className={`${pulse} mt-4 h-10 w-32`} />
        </div>
        <SkeletonTable rows={4} />
      </main>
    );
  }

  return (
    <main
      aria-label={type === "portal" ? "Loading resident portal" : "Loading financial ledger"}
      aria-busy="true"
      className="space-y-6"
    >
      <SkeletonHeader />
      {type === "ledger" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((item) => (
            <div key={item} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className={`${pulse} h-5 w-36`} />
              <div className={`${pulse} mt-5 h-28 w-full`} />
            </div>
          ))}
        </div>
      ) : null}
      <SkeletonTable rows={5} />
    </main>
  );
}

function SkeletonHeader() {
  return (
    <div className="space-y-3">
      <div className={`${pulse} h-3 w-24`} />
      <div className={`${pulse} h-9 w-64`} />
      <div className={`${pulse} h-4 w-full max-w-xl`} />
    </div>
  );
}

function SkeletonTable({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className={`${pulse} h-5 w-40`} />
      <div className="mt-5 space-y-4">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-4 border-b border-gray-100 pb-4 last:border-0">
            <div className={`${pulse} h-4 w-20 shrink-0`} />
            <div className={`${pulse} h-4 flex-1`} />
            <div className={`${pulse} hidden h-4 w-28 sm:block`} />
          </div>
        ))}
      </div>
    </div>
  );
}
