import { useState } from 'react';
import type { ReadyMadeStockRow } from '../../types';
import { fmtTaka } from '../../types';
import { apiPost } from '../../api/client';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Stepper } from '../../components/ui/Stepper';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { materialStatus } from './RawMaterialsTab';

interface Props { stock: ReadyMadeStockRow[]; onChanged: () => void; }

export function ReadyMadeStockTab({ stock, onChanged }: Props) {
  const toast = useToast();
  const [wasteFor, setWasteFor] = useState<ReadyMadeStockRow | null>(null);
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('expired');

  const recordWaste = async () => {
    if (!wasteFor) return;
    try {
      await apiPost('/inventory/waste', { menuItemId: wasteFor.menu_item_id, quantity: qty });
      toast(`Waste recorded: ${qty}× ${wasteFor.name} (${reason})`);
      setWasteFor(null);
      onChanged();
    } catch (e) { toast(e instanceof Error ? e.message : 'Failed to record waste', 'error'); }
  };

  const columns: Column<ReadyMadeStockRow>[] = [
    {
      key: 'name', header: 'Item',
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">{r.expires_daily ? '🥟' : '🥤'}</span>
          <span className="text-lg font-extrabold text-ink">{r.name}</span>
        </div>
      ),
      sortValue: (r) => r.name,
    },
    { key: 'price', header: 'Selling', align: 'right', render: (r) => <span className="font-mono font-extrabold text-orange-600 text-lg">{fmtTaka(r.selling_price)}</span>, sortValue: (r) => r.selling_price },
    { key: 'cost', header: 'Cost', align: 'right', render: (r) => <span className="font-mono font-semibold text-body text-lg">{fmtTaka(r.average_unit_cost)}</span>, sortValue: (r) => r.average_unit_cost },
    {
      key: 'margin', header: 'Margin', align: 'right',
      render: (r) => r.average_unit_cost > 0
        ? <span className="font-mono font-extrabold text-emerald-700 text-lg">{Math.round(((r.selling_price - r.average_unit_cost) / r.selling_price) * 100)}%</span>
        : <span className="text-label font-bold">—</span>,
      sortValue: (r) => r.average_unit_cost > 0 ? (r.selling_price - r.average_unit_cost) / r.selling_price : 0,
    },
    { key: 'stock', header: 'On Hand', align: 'right', render: (r) => <span className="font-mono font-extrabold text-ink text-lg">{r.current_stock}</span>, sortValue: (r) => r.current_stock },
    { key: 'reorder', header: 'Reorder', align: 'right', render: (r) => <span className="font-mono font-semibold text-body text-lg">{r.reorder_level}</span> },
    {
      key: 'status', header: 'Status',
      render: (r) => {
        if (r.expires_daily) return <span className="rounded-full bg-emerald-100 px-3.5 py-1.5 text-sm font-extrabold text-emerald-800">📅 Daily</span>;
        const s = materialStatus(r);
        if (s === 'ok') return <span className="rounded-full bg-emerald-100 px-3.5 py-1.5 text-sm font-extrabold text-emerald-800">✓ OK</span>;
        if (s === 'warn') return <span className="rounded-full bg-amber-100 px-3.5 py-1.5 text-sm font-extrabold text-amber-800">⚠ Reorder</span>;
        return <span className="rounded-full bg-rose-100 px-3.5 py-1.5 text-sm font-extrabold text-rose-700">🚨 Critical</span>;
      },
    },
    {
      key: 'actions', header: '',
      render: (r) => (
        <button
          onClick={() => { setWasteFor(r); setQty(1); setReason('expired'); }}
          className="rounded-lg bg-amber-100 px-3.5 py-2 text-sm font-extrabold text-amber-800 hover:bg-amber-200 transition-colors"
        >
          🗑️ Waste
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="rounded-2xl border border-hairline bg-white overflow-hidden shadow-sm">
        <DataTable columns={columns} rows={stock} rowKey={(r) => r.menu_item_id} emptyMessage="No sellable items" />
      </div>

      <Modal open={wasteFor !== null} onClose={() => setWasteFor(null)} title={`Record waste — ${wasteFor?.name}`}>
        <div className="flex items-center gap-4">
          <Stepper value={qty} min={1} max={Math.max(1, wasteFor?.current_stock ?? 1)} onChange={setQty} />
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-12 flex-1 rounded-xl border border-hairline bg-white px-4 text-base font-bold text-ink outline-none focus:border-emerald-400"
          >
            <option value="expired">Expired</option>
            <option value="damaged">Damaged</option>
            <option value="other">Other</option>
          </select>
        </div>
        <p className="mt-3 text-base font-semibold text-body">Deducts today's stock and logs the cost impact.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setWasteFor(null)} className="rounded-xl bg-surface-2 px-5 py-2.5 text-base font-extrabold text-ink hover:bg-emerald-50 transition-colors">Cancel</button>
          <button onClick={recordWaste} className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-base font-extrabold text-white shadow-md hover:shadow-lg transition-all">Confirm Waste</button>
        </div>
      </Modal>
    </>
  );
}