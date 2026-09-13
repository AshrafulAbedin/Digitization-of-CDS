import { useMemo, useState } from 'react';
import type { RawMaterial } from '../../types';
import { fmtTaka } from '../../types';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { SearchInput } from '../../components/ui/SearchInput';

export function materialStatus(m: { current_stock: number; reorder_level: number }) {
  if (m.current_stock <= m.reorder_level * 0.5) return 'critical' as const;
  if (m.current_stock <= m.reorder_level) return 'warn' as const;
  return 'ok' as const;
}

export function RawMaterialsTab({ materials }: { materials: RawMaterial[] }) {
  const [query, setQuery] = useState('');
  const [belowOnly, setBelowOnly] = useState(false);

  const rows = useMemo(
    () => materials.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()) && (!belowOnly || m.current_stock <= m.reorder_level)),
    [materials, query, belowOnly],
  );

  const stats = useMemo(() => {
    const total = materials.length;
    const critical = materials.filter((m) => materialStatus(m) === 'critical').length;
    const warn = materials.filter((m) => materialStatus(m) === 'warn').length;
    const totalValue = materials.reduce((s, m) => s + m.current_stock * m.average_unit_cost, 0);
    return { total, critical, warn, totalValue };
  }, [materials]);

  const columns: Column<RawMaterial>[] = [
    {
      key: 'name', header: 'Material',
      render: (m) => (
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">🥕</span>
          <span className="text-lg font-extrabold text-ink">{m.name}</span>
        </div>
      ),
      sortValue: (m) => m.name,
    },
    { key: 'unit', header: 'Unit', render: (m) => <span className="text-base font-semibold text-body">{m.unit}</span> },
    {
      key: 'stock', header: 'On Hand', align: 'right',
      render: (m) => (<span className="font-mono font-extrabold text-ink text-lg">{m.current_stock} <span className="text-sm text-label font-semibold">{m.unit}</span></span>),
      sortValue: (m) => m.current_stock,
    },
    {
      key: 'reorder', header: 'Reorder At', align: 'right',
      render: (m) => (<span className="font-mono font-semibold text-body text-base">{m.reorder_level} <span className="text-sm text-label">{m.unit}</span></span>),
      sortValue: (m) => m.reorder_level,
    },
    {
      key: 'cost', header: 'Avg Cost', align: 'right',
      render: (m) => (<span className="font-mono font-extrabold text-orange-600 text-lg">{fmtTaka(m.average_unit_cost)}</span>),
      sortValue: (m) => m.average_unit_cost,
    },
    {
      key: 'status', header: 'Status',
      render: (m) => {
        const s = materialStatus(m);
        if (s === 'ok') return <span className="rounded-full bg-emerald-100 px-3.5 py-1.5 text-sm font-extrabold text-emerald-800">✓ OK</span>;
        if (s === 'warn') return <span className="rounded-full bg-amber-100 px-3.5 py-1.5 text-sm font-extrabold text-amber-800">⚠ Reorder</span>;
        return <span className="rounded-full bg-rose-100 px-3.5 py-1.5 text-sm font-extrabold text-rose-700">🚨 Critical</span>;
      },
      sortValue: (m) => m.current_stock / Math.max(1, m.reorder_level),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        <StatCard icon="📦" label="Total Materials" value={String(stats.total)} tone="from-emerald-200/70 to-transparent" accent="text-emerald-700" />
        <StatCard icon="✅" label="Healthy" value={String(stats.total - stats.warn - stats.critical)} tone="from-emerald-300/70 to-transparent" accent="text-emerald-700" />
        <StatCard icon="⚠️" label="Low Stock" value={String(stats.warn)} tone="from-amber-200/70 to-transparent" accent="text-amber-700" />
        <StatCard icon="💰" label="Inventory Value" value={fmtTaka(stats.totalValue)} tone="from-orange-200/70 to-transparent" accent="text-orange-600" />
      </div>

      <div className="flex items-center gap-3">
        <SearchInput placeholder="Filter materials…" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-sm flex-1" />
        <label className="flex items-center gap-2 rounded-xl border border-hairline bg-white px-4 py-2.5 text-sm font-extrabold text-ink cursor-pointer hover:border-emerald-400 transition-colors">
          <input type="checkbox" checked={belowOnly} onChange={(e) => setBelowOnly(e.target.checked)} className="accent-emerald-500 w-4 h-4" />
          Below reorder only
        </label>
      </div>

      <div className="rounded-2xl border border-hairline bg-white overflow-hidden shadow-sm">
        <DataTable columns={columns} rows={rows} rowKey={(m) => m.raw_material_id} emptyMessage="No raw materials" />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, tone, accent }: { icon: string; label: string; value: string; tone: string; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-hairline bg-white p-6 shadow-sm hover:shadow-md transition-all">
      <div className={`absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br ${tone} blur-2xl`} />
      <div className="relative z-10">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100 text-2xl">{icon}</div>
        <p className="mt-4 text-sm font-extrabold uppercase tracking-widest text-body">{label}</p>
        <p className={`font-mono text-5xl font-extrabold mt-1 ${accent}`}>{value}</p>
      </div>
    </div>
  );
}