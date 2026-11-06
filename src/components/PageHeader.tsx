export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-8 max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="mt-3 text-base leading-7 text-slate-500">{description}</p>
    </header>
  );
}
