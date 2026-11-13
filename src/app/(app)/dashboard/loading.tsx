export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-8 p-8">
      <div>
        <div className="mb-4 h-8 w-64 rounded-md bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded-md bg-slate-200" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="flex h-48 flex-col rounded-xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center space-x-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100" />
              <div className="h-5 w-32 rounded-md bg-slate-200" />
            </div>
            <div className="mt-2 space-y-2">
              <div className="h-3 w-full rounded-md bg-slate-100" />
              <div className="h-3 w-4/5 rounded-md bg-slate-100" />
            </div>
            <div className="mt-auto h-4 w-24 rounded-md bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
