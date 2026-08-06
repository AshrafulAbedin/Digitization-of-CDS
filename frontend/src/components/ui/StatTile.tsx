interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}

export function StatTile({ label, value, sub, valueClass = 'text-ink' }: StatTileProps) {
  return (
    <div className="rounded-xl border border-[#e7e2da] bg-white p-4">
      <div className="text-sm text-label">{label}</div>
      <div className={`tabular mt-1 text-2xl font-bold ${valueClass}`}>{value}</div>
      {sub && <div className="mt-1 text-sm text-label">{sub}</div>}
    </div>
  );
}
