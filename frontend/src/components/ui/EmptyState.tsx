export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
      <div className="text-5xl opacity-30" aria-hidden>
        🍽️
      </div>
      <div className="text-base font-bold text-slate-300">{title}</div>
      {hint && <div className="max-w-sm text-sm text-slate-500">{hint}</div>}
    </div>
  );
}