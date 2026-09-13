import { useState } from 'react';
import type { ReadyMadeStockRow, DailyStockRow } from '../../types';
import { fmtTaka } from '../../types';
import { apiPatch } from '../../api/client';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';

interface Props {
  stock: ReadyMadeStockRow[];
  dailyStock: DailyStockRow[];
  onChanged: () => void;
  onRestock: (type: 'ready_made', id: number) => void;
  onEndOfDay: () => void;
}

export function ReadyMadeStockTab({ stock, dailyStock, onChanged, onRestock, onEndOfDay }: Props) {
  const toast = useToast();
  const [editPriceFor, setEditPriceFor] = useState<ReadyMadeStockRow | null>(null);
  const [newPrice, setNewPrice] = useState('');

  const handleEditPrice = async () => {
    if (!editPriceFor) return;
    try {
      await apiPatch(`/inventory/menu-items/${editPriceFor.menu_item_id}/price`, { price: Number(newPrice) });
      toast('Price updated successfully');
      setEditPriceFor(null);
      setNewPrice('');
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Price update failed', 'error');
    }
  };

  const nonExpiry = stock
    .filter((r) => !r.expires_daily)
    .sort((a, b) => {
      const aLow = a.current_stock <= a.reorder_level ? 0 : 1;
      const bLow = b.current_stock <= b.reorder_level ? 0 : 1;
      if (aLow !== bLow) return aLow - bLow;
      return a.name.localeCompare(b.name);
    });

  const colA: Column<ReadyMadeStockRow>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-body">{r.name}</span> },
    { key: 'price', header: 'Selling price', align: 'right', render: (r) => fmtTaka(r.selling_price) },
    { key: 'stock', header: 'Current stock', align: 'right', render: (r) => String(r.current_stock) },
    { key: 'cost', header: 'Avg cost', align: 'right', render: (r) => fmtTaka(r.average_unit_cost) },
    {
      key: 'margin',
      header: 'Margin',
      align: 'right',
      render: (r) => {
        const diff = r.selling_price - r.average_unit_cost;
        const color = diff >= 0 ? 'text-ok' : 'text-warn';
        return <span className={`font-medium ${color}`}>{fmtTaka(diff)}</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const isLow = r.current_stock <= r.reorder_level;
        return <StatusBadge tone={isLow ? 'critical' : 'ok'}>{isLow ? 'LOW' : 'OK'}</StatusBadge>;
      },
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="secondary" onClick={() => onRestock('ready_made', r.menu_item_id)}>Purchase</Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditPriceFor(r); setNewPrice(r.selling_price.toString()); }}>Edit Price</Button>
        </div>
      ),
    },
  ];

  const colB: Column<DailyStockRow>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-body">{r.name}</span> },
    { key: 'received', header: 'Received', align: 'right', render: (r) => String(r.quantity_received) },
    { key: 'sold', header: 'Sold', align: 'right', render: (r) => String(r.quantity_sold) },
    { key: 'remaining', header: 'Remaining', align: 'right', render: (r) => String(r.quantity_received - r.quantity_sold) },
    { key: 'cost', header: 'Avg cost', align: 'right', render: (r) => fmtTaka(r.average_unit_cost) },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" onClick={() => onRestock('ready_made', r.menu_item_id)}>Purchase</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-3 text-lg font-bold text-ink">Non-Expiry Items</h2>
        <DataTable columns={colA} rows={nonExpiry} rowKey={(r) => r.menu_item_id} emptyMessage="No non-expiry items" />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Daily-Expiry Items</h2>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onEndOfDay}>End of Day</Button>
            <Button variant="primary" size="sm" onClick={() => onRestock('ready_made', 0)}>Purchase</Button>
          </div>
        </div>
        <DataTable columns={colB} rows={dailyStock} rowKey={(r) => r.menu_item_id} emptyMessage="No daily-expiry items" />
      </div>

      <Modal open={editPriceFor !== null} onClose={() => setEditPriceFor(null)} title="Edit Selling Price">
        {editPriceFor && (
          <div className="space-y-4">
            <div className="text-sm text-body">
              Current price: <span className="font-medium text-ink">{fmtTaka(editPriceFor.selling_price)}</span>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">New price</label>
              <input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-full rounded-lg border border-[#d9d4cc] bg-white px-3 py-2 text-sm outline-none focus:border-gold"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditPriceFor(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleEditPrice}>Save</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
