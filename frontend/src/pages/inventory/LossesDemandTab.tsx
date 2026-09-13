import { useState, useEffect } from 'react';
import type { StockoutRow, WasteRow, Product } from '../../types';
import { fmtTaka } from '../../types';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { apiGet, apiPost } from '../../api/client';

interface Props {
  stockouts: StockoutRow[];
  waste: WasteRow[];
  onEndOfDay: () => void;
}

export function LossesDemandTab({ stockouts, waste, onEndOfDay }: Props) {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [item, setItem] = useState('');
  const [qty, setQty] = useState('1');

  useEffect(() => {
    if (modalOpen && products.length === 0) {
      apiGet<Product[]>('/products').then(setProducts).catch(() => {});
    }
  }, [modalOpen, products.length]);

  const submitStockout = async () => {
    try {
      await apiPost('/inventory/stockout', { menuItemId: Number(item), quantity: Number(qty) });
      toast('Stockout recorded');
      setModalOpen(false);
      setItem('');
      setQty('1');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to record stockout', 'error');
    }
  };

  const missedCols: Column<StockoutRow>[] = [
    { key: 'date', header: 'Date', render: (r) => new Date(r.request_date).toLocaleDateString('en-GB') },
    { key: 'item', header: 'Item', render: (r) => <span className="font-medium text-body">{r.name}</span> },
    { key: 'qty', header: 'Qty', align: 'right', render: (r) => String(r.quantity) },
    { key: 'dow', header: 'Day of week', render: (r) => new Date(r.request_date).toLocaleDateString('en-US', { weekday: 'long' }) },
  ];

  const wasteCols: Column<WasteRow>[] = [
    { key: 'date', header: 'Date', render: (r) => new Date(r.stock_date).toLocaleDateString('en-GB') },
    { key: 'item', header: 'Item', render: (r) => <span className="font-medium text-body">{r.name}</span> },
    { key: 'received', header: 'Received', align: 'right', render: (r) => String(r.quantity_received) },
    { key: 'sold', header: 'Sold', align: 'right', render: (r) => String(r.quantity_sold) },
    { key: 'wasted', header: 'Wasted', align: 'right', render: (r) => String(r.quantity_wasted) },
    { key: 'impact', header: 'Cost impact', align: 'right', render: (r) => <span className="text-warn">{fmtTaka(r.cost_impact)}</span> },
  ];

  const totalImpact = waste.reduce((s, w) => s + Number(w.cost_impact), 0);

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Missed Demand</h2>
          <Button variant="secondary" size="sm" onClick={() => setModalOpen(true)}>
            Record Stockout
          </Button>
        </div>
        <DataTable columns={missedCols} rows={stockouts} rowKey={(r) => r.request_id} emptyMessage="No missed demand recorded." />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Waste Log</h2>
          <Button variant="secondary" size="sm" onClick={onEndOfDay}>
            Recalculate Today
          </Button>
        </div>
        <DataTable columns={wasteCols} rows={waste} rowKey={(r) => r.daily_stock_id} emptyMessage="No waste recorded." />
        <div className="mt-2 text-right text-sm font-bold text-ink">
          Total cost impact: <span className="text-warn">{fmtTaka(totalImpact)}</span>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Stockout">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Item</label>
            <select
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#d9d4cc] bg-white px-3 text-sm outline-none focus:border-gold"
            >
              <option value="">Select item...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Quantity</label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#d9d4cc] bg-white px-3 text-sm outline-none focus:border-gold"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!item || Number(qty) < 1} onClick={submitStockout}>
              Submit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
