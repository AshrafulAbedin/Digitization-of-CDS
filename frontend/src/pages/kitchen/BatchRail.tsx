import { useState } from 'react';
import type { Batch, Product } from '../../types';

interface BatchRailProps {
  batches: Batch[];
  kitchenItems: Product[];
  onStatus: (batchId: number, status: 'available' | 'exhausted') => void;
  onNewBatch: (menuItemId: number) => void;
}

export function BatchRail({ batches, kitchenItems, onStatus, onNewBatch }: BatchRailProps) {
  const [selectedItem, setSelectedItem] = useState('');

  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
        <span className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white p-1.5 rounded-lg text-xs">🍳</span>
        Active Batches
      </h3>

      <div className="rounded-2xl border border-hairline bg-white p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-body">Start New Batch</p>
        <div className="flex gap-2">
          <select
            value={selectedItem}
            onChange={(e) => setSelectedItem(e.target.value)}
            className="flex-1 rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink font-medium outline-none focus:border-emerald-400"
          >
            <option value="">Select item...</option>
            {kitchenItems.map((item) => (<option key={item.id} value={item.id}>{item.name}</option>))}
          </select>
          <button
            onClick={() => { if (selectedItem) { onNewBatch(Number(selectedItem)); setSelectedItem(''); } }}
            disabled={!selectedItem}
            className="rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 px-4 py-2 text-sm font-bold text-white shadow-md disabled:opacity-40 transition-all"
          >
            Add
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {batches.length === 0 && <p className="text-sm text-body italic px-2 font-medium">No active batches right now.</p>}
        {batches.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-xl border border-hairline bg-white p-3">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${b.status === 'available' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-orange-400 animate-pulse'}`} />
              <div>
                <p className="font-semibold text-sm text-ink leading-tight">{b.name}</p>
                <p className="text-[10px] font-mono text-label uppercase font-medium">Batch #{b.id}</p>
              </div>
            </div>
            {b.status === 'preparing' ? (
              <button onClick={() => onStatus(b.id, 'available')} className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-200 transition-colors">Ready</button>
            ) : (
              <button onClick={() => onStatus(b.id, 'exhausted')} className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-200 transition-colors">Exhaust</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}