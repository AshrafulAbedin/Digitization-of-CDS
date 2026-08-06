import { useState } from 'react';
import type { Batch, Product } from '../../types';
import { Button } from '../../components/ui/Button';

const dot: Record<Batch['status'], string> = {
  preparing: 'bg-gold',
  available: 'bg-kitchen',
  exhausted: 'bg-warn',
};

interface BatchRailProps {
  batches: Batch[];
  kitchenItems: Product[];
  onStatus: (batchId: number, status: 'available' | 'exhausted') => void;
  onNewBatch: (menuItemId: number) => void;
}

export function BatchRail({ batches, kitchenItems, onStatus, onNewBatch }: BatchRailProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [itemId, setItemId] = useState<number | ''>('');

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-ink">Batches</h2>
      <div className="space-y-2">
        {batches.map((b) => (
          <div key={b.id} className="flex items-center gap-2 rounded-xl border border-[#e7e2da] bg-white px-3 py-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot[b.status]}`} />
            <span className="min-w-0 flex-1 truncate text-body">
              <span className="font-mono text-sm">#{b.id}</span> {b.name}
            </span>
            {b.status === 'preparing' && (
              <Button size="sm" variant="success" onClick={() => onStatus(b.id, 'available')}>
                Put on sale
              </Button>
            )}
            {b.status === 'available' && (
              <Button size="sm" variant="danger" onClick={() => onStatus(b.id, 'exhausted')}>
                Sold out
              </Button>
            )}
          </div>
        ))}
        {batches.length === 0 && <p className="text-sm text-label">No batches today yet.</p>}

        {formOpen ? (
          <div className="space-y-2 rounded-xl border border-[#e7e2da] bg-white p-3">
            <select
              value={itemId}
              onChange={(e) => setItemId(Number(e.target.value))}
              className="h-10 w-full rounded-lg border border-[#d9d4cc] bg-white px-2 text-base"
            >
              <option value="">Select kitchen item…</option>
              {kitchenItems.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={itemId === ''}
                onClick={() => {
                  onNewBatch(itemId as number);
                  setFormOpen(false);
                  setItemId('');
                }}
              >
                Start cooking
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" className="w-full" onClick={() => setFormOpen(true)}>
            + New batch
          </Button>
        )}
      </div>
    </section>
  );
}
