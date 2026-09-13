import { useState } from 'react';
import type { ReadyMadeStockRow } from '../../types';
import { fmtTaka } from '../../types';
import { apiPost, apiPatch } from '../../api/client';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Stepper } from '../../components/ui/Stepper';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { materialStatus } from './RawMaterialsTab';

interface Props {
  stock: ReadyMadeStockRow[];
  onChanged: () => void;
}

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
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to record waste', 'error');
    }
  };

  const columns: Column<ReadyMadeStockRow>[] = [
    { key: 'name', header: 'Item', render: (r) => <span className="font-medium text-body">{r.name}</span>, sortValue: (r) => r.name },
    { key: 'price', header: 'Selling price', align: 'right', render: (r) => fmtTaka(r.selling_price), sortValue: (r) => r.selling_price },
    { key: 'cost', header: 'Avg cost', align: 'right', render: (r) => fmtTaka(r.average_unit_cost), sortValue: (r) => r.average_unit_cost },
    {
      key: 'margin',
      header: 'Margin %',
      align: 'right',
      render: (r) =>
        r.average_unit_cost > 0
          ? `${Math.round(((r.selling_price - r.average_unit_cost) / r.selling_price) * 100)}%`
          : '—',
      sortValue: (r) => (r.average_unit_cost > 0 ? (r.selling_price - r.average_unit_cost) / r.selling_price : 0),
    },
    { key: 'stock', header: 'On hand', align: 'right', render: (r) => String(r.current_stock), sortValue: (r) => r.current_stock },
    { key: 'reorder', header: 'Reorder level', align: 'right', render: (r) => String(r.reorder_level) },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        if (r.expires_daily) return <StatusBadge tone="gold">Daily</StatusBadge>;
        const s = materialStatus(r);
        return <StatusBadge tone={s}>{s === 'ok' ? 'OK' : s === 'warn' ? 'Reorder' : 'Critical'}</StatusBadge>;
      },
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex gap-2">
          {!r.expires_daily && (
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                const newPrice = prompt(`Enter new selling price for ${r.name} (must be >= ${fmtTaka(r.average_unit_cost)}):`, r.selling_price.toString());
                if (newPrice && !isNaN(Number(newPrice)) && Number(newPrice) > 0) {
                  try {
                    await apiPatch(`/inventory/menu-items/${r.menu_item_id}/price`, { price: Number(newPrice) });
                    toast('Price updated successfully');
                    onChanged();
                  } catch (e) {
                    alert(e instanceof Error ? e.message : 'Price update failed');
                  }
                }
              }}
            >
              Edit price
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              const newLevel = prompt(`Enter new reorder level for ${r.name}:`, r.reorder_level.toString());
              if (newLevel && !isNaN(Number(newLevel)) && Number(newLevel) >= 0) {
                try {
                  await apiPatch(`/inventory/menu-items/${r.menu_item_id}/reorder-level`, { reorderLevel: Number(newLevel) });
                  toast('Reorder level updated');
                  onChanged();
                } catch (e) {
                  alert(e instanceof Error ? e.message : 'Update failed');
                }
              }
            }}
          >
            Edit reorder
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setWasteFor(r);
              setQty(1);
              setReason('expired');
            }}
          >
            Record waste
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable columns={columns} rows={stock} rowKey={(r) => r.menu_item_id} emptyMessage="No sellable items" />
      <Modal open={wasteFor !== null} onClose={() => setWasteFor(null)} title={`Record waste — ${wasteFor?.name}`}>
        <div className="flex items-center gap-4">
          <Stepper value={qty} min={1} max={Math.max(1, wasteFor?.current_stock ?? 1)} onChange={setQty} />
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-10 flex-1 rounded-lg border border-[#d9d4cc] bg-white px-2 text-sm"
          >
            <option value="expired">Expired</option>
            <option value="damaged">Damaged</option>
            <option value="other">Other</option>
          </select>
        </div>
        <p className="mt-2 text-sm text-label">Deducts today’s stock and logs the cost impact.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setWasteFor(null)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={recordWaste}>
            Confirm
          </Button>
        </div>
      </Modal>
    </>
  );
}
