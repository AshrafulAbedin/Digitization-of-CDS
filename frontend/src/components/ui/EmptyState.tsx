export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#ddd6cc] py-10 text-center">
      <div className="text-2xl" aria-hidden>
        ◌
      </div>
      <div className="font-medium text-body">{title}</div>
      {hint && <div className="max-w-sm text-sm text-label">{hint}</div>}
    </div>
  );
}
