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

export function RawMaterialsTab({ materials, onRestock }: { materials: RawMaterial[], onRestock: (type: 'raw_material', id: number) => void }) {
  const [query, setQuery] = useState('');
  const [belowOnly, setBelowOnly] = useState(false);

  const rows = useMemo(() => {
    let filtered = materials.filter(
      (m) =>
        m.name.toLowerCase().includes(query.toLowerCase()) &&
        (!belowOnly || m.current_stock <= m.reorder_level)
    );
    // Sort order: LOW-status rows first, then alphabetical.
    return filtered.sort((a, b) => {
      const aLow = a.current_stock <= a.reorder_level ? 0 : 1;
      const bLow = b.current_stock <= b.reorder_level ? 0 : 1;
      if (aLow !== bLow) return aLow - bLow;
      return a.name.localeCompare(b.name);
    });
  }, [materials, query, belowOnly]);

  const columns: Column<RawMaterial>[] = [
    { key: 'name', header: 'Material', render: (m) => <span className="font-medium text-body">{m.name}</span> },
    { key: 'unit', header: 'Unit', render: (m) => m.unit },
    { key: 'stock', header: 'Current stock', align: 'right', render: (m) => String(m.current_stock) },
    { key: 'reorder', header: 'Reorder level', align: 'right', render: (m) => String(m.reorder_level) },
    { key: 'cost', header: 'Avg unit cost', align: 'right', render: (m) => fmtTaka(m.average_unit_cost) },
    {
      key: 'status',
      header: 'Status',
      render: (m) => {
        const isLow = m.current_stock <= m.reorder_level;
        return (
          <StatusBadge tone={isLow ? 'critical' : 'ok'}>{isLow ? 'LOW' : 'OK'}</StatusBadge>
        );
      }
    },
    {
      key: 'actions',
      header: '',
      render: (m) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onRestock('raw_material', m.raw_material_id)}
        >
          Restock
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
