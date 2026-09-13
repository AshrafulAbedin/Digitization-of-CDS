import { useMemo, useState } from 'react';
import type { RawMaterial } from '../../types';
import { fmtTaka } from '../../types';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
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
    () =>
      materials.filter(
        (m) =>
          m.name.toLowerCase().includes(query.toLowerCase()) &&
          (!belowOnly || m.current_stock <= m.reorder_level),
      ),
    [materials, query, belowOnly],
  );

  const columns: Column<RawMaterial>[] = [
    { key: 'name', header: 'Material', render: (m) => <span className="font-medium text-body">{m.name}</span>, sortValue: (m) => m.name },
    { key: 'unit', header: 'Unit', render: (m) => m.unit },
    { key: 'stock', header: 'On hand', align: 'right', render: (m) => `${m.current_stock} ${m.unit}`, sortValue: (m) => m.current_stock },
    { key: 'reorder', header: 'Reorder level', align: 'right', render: (m) => `${m.reorder_level} ${m.unit}`, sortValue: (m) => m.reorder_level },
    { key: 'cost', header: 'Avg unit cost', align: 'right', render: (m) => fmtTaka(m.average_unit_cost), sortValue: (m) => m.average_unit_cost },
    {
      key: 'status',
      header: 'Status',
      render: (m) => {
        const s = materialStatus(m);
        return (
          <StatusBadge tone={s}>{s === 'ok' ? 'OK' : s === 'warn' ? 'Reorder' : 'Critical'}</StatusBadge>
        );
      },
      sortValue: (m) => m.current_stock / Math.max(1, m.reorder_level),
    },
    {
      key: 'actions',
      header: '',
      render: (m) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            const newLevel = prompt(`Enter new reorder level for ${m.name}:`, m.reorder_level.toString());
            if (newLevel && !isNaN(Number(newLevel)) && Number(newLevel) >= 0) {
              fetch(`/api/inventory/raw-materials/${m.raw_material_id}/reorder-level`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reorderLevel: Number(newLevel) }),
              }).then(() => alert('Reorder level updated. Refresh page to see changes.'));
            }
          }}
        >
          Edit reorder
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <SearchInput placeholder="Filter materials…" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs flex-1" />
        <label className="flex items-center gap-2 text-sm text-body">
          <input type="checkbox" checked={belowOnly} onChange={(e) => setBelowOnly(e.target.checked)} className="accent-ink" />
          Below reorder only
        </label>
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(m) => m.raw_material_id} emptyMessage="No raw materials" />
    </div>
  );
}
