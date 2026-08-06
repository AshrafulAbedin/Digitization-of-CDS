import { useMemo, useState } from 'react';
import type { StockoutRow, WasteRow } from '../../types';
import { fmtTaka } from '../../types';
import { EmptyState } from '../../components/ui/EmptyState';

interface Props {
  stockouts: StockoutRow[];
  waste: WasteRow[];
}

export function LossesDemandTab({ stockouts, waste }: Props) {
  const [groupByItem, setGroupByItem] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stockouts) map.set(s.name, (map.get(s.name) ?? 0) + s.quantity);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [stockouts]);

  const wasteTotal = waste.reduce((s, w) => s + Number(w.cost_impact), 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-[#e7e2da] bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink">Missed demand</h3>
            <p className="text-sm text-label">What customers wanted but we couldn’t sell.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-body">
            <input type="checkbox" checked={groupByItem} onChange={(e) => setGroupByItem(e.target.checked)} className="accent-ink" />
            Group by item
          </label>
        </div>
        <div className="mt-3">
          {stockouts.length === 0 ? (
            <EmptyState title="No stockout requests" hint="Cashiers log missed demand from the POS when an item is unavailable." />
          ) : groupByItem ? (
            <ul>
              {grouped.map(([name, qty]) => (
                <li key={name} className="flex justify-between border-b border-[#f1ede7] py-1.5 text-sm last:border-0">
                  <span className="text-body">{name}</span>
                  <span className="tabular font-medium text-ink">{qty} asked</span>
                </li>
              ))}
            </ul>
          ) : (
            <ul>
              {stockouts.map((s) => (
                <li key={s.request_id} className="flex justify-between border-b border-[#f1ede7] py-1.5 text-sm last:border-0">
                  <span className="text-body">
                    {s.name} <span className="text-label">× {s.quantity}</span>
                  </span>
                  <span className="tabular text-label">
                    {new Date(s.request_time).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[#e7e2da] bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink">Waste log</h3>
            <p className="text-sm text-label">Recorded from daily stock and end-of-day counts.</p>
          </div>
          <span className="tabular font-semibold text-warn">{fmtTaka(wasteTotal)} lost</span>
        </div>
        <div className="mt-3">
          {waste.length === 0 ? (
            <EmptyState title="No waste recorded" hint="Waste is logged from the Ready-Made Stock tab or the end-of-day process." />
          ) : (
            <ul>
              {waste.map((w) => (
                <li key={w.daily_stock_id} className="flex justify-between border-b border-[#f1ede7] py-1.5 text-sm last:border-0">
                  <span className="text-body">
                    {w.name} <span className="text-label">× {w.quantity_wasted}</span>
                  </span>
                  <span className="flex gap-3">
                    <span className="tabular text-warn">−{fmtTaka(w.cost_impact)}</span>
                    <span className="tabular text-label">{new Date(w.stock_date).toLocaleDateString('en-GB')}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
