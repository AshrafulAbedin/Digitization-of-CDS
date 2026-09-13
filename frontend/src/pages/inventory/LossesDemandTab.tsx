import { useMemo, useState } from 'react';
import type { StockoutRow, WasteRow } from '../../types';
import { fmtTaka } from '../../types';
import { EmptyState } from '../../components/ui/EmptyState';

interface Props { stockouts: StockoutRow[]; waste: WasteRow[]; }

export function LossesDemandTab({ stockouts, waste }: Props) {
  const [groupByItem, setGroupByItem] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stockouts) map.set(s.name, (map.get(s.name) ?? 0) + s.quantity);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [stockouts]);

  const wasteTotal = waste.reduce((s, w) => s + Number(w.cost_impact), 0);
  const stockoutTotal = stockouts.reduce((s, r) => s + r.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-5">
        <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-100 to-white p-6 shadow-sm">
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-emerald-300/40 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-3xl shadow-md shadow-emerald-500/30">📊</div>
            <div>
              <p className="text-sm font-extrabold uppercase tracking-widest text-emerald-800">Missed Demand</p>
              <p className="font-mono text-5xl font-extrabold text-ink">{stockoutTotal} <span className="text-xl text-body font-bold">units</span></p>
            </div>
          </div>
          <p className="relative mt-4 text-base font-semibold text-body">What customers wanted but couldn't be sold.</p>
        </div>

        <div className="relative overflow-hidden rounded-3xl border-2 border-rose-300 bg-gradient-to-br from-rose-100 to-white p-6 shadow-sm">
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-rose-300/40 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white text-3xl shadow-md shadow-rose-500/30">🗑️</div>
            <div>
              <p className="text-sm font-extrabold uppercase tracking-widest text-rose-800">Waste Cost</p>
              <p className="font-mono text-5xl font-extrabold text-ink">{fmtTaka(wasteTotal)}</p>
            </div>
          </div>
          <p className="relative mt-4 text-base font-semibold text-body">Value lost to expired or damaged stock.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-hairline bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">📢</div>
              <div>
                <h3 className="font-display text-2xl font-extrabold text-ink">Missed Demand</h3>
                <p className="text-base font-semibold text-body">Logged from POS when items were out</p>
              </div>
            </div>
            <label className="flex items-center gap-2 rounded-xl bg-surface-2 px-4 py-2.5 text-base font-extrabold text-ink cursor-pointer hover:bg-emerald-100 transition-colors border border-hairline">
              <input type="checkbox" checked={groupByItem} onChange={(e) => setGroupByItem(e.target.checked)} className="accent-emerald-500 w-4 h-4" />
              Group
            </label>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {stockouts.length === 0 ? (
              <EmptyState title="No stockouts" hint="Cashiers log missed demand from POS when an item is unavailable." />
            ) : groupByItem ? (
              <ul>
                {grouped.map(([name, qty]) => (
                  <li key={name} className="flex justify-between border-b border-hairline py-4 last:border-0">
                    <span className="text-lg font-extrabold text-ink">{name}</span>
                    <span className="rounded-full bg-emerald-100 px-4 py-1.5 font-mono text-base font-extrabold text-emerald-800">{qty} asked</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul>
                {stockouts.map((s) => (
                  <li key={s.request_id} className="flex justify-between border-b border-hairline py-4 last:border-0">
                    <span className="text-lg">
                      <span className="font-extrabold text-ink">{s.name}</span>
                      <span className="ml-3 rounded-full bg-emerald-100 px-3 py-1 text-base font-extrabold text-emerald-800">× {s.quantity}</span>
                    </span>
                    <span className="font-mono text-sm font-semibold text-body">
                      {new Date(s.request_time).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-hairline bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-2xl">🗑️</div>
              <div>
                <h3 className="font-display text-2xl font-extrabold text-ink">Waste Log</h3>
                <p className="text-base font-semibold text-body">Recorded from daily stock counts</p>
              </div>
            </div>
            {wasteTotal > 0 && (
              <span className="rounded-full bg-rose-100 px-4 py-2 text-base font-extrabold text-rose-800">{fmtTaka(wasteTotal)} lost</span>
            )}
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {waste.length === 0 ? (
              <EmptyState title="No waste recorded" hint="Waste is logged from the Ready-Made tab or end-of-day process." />
            ) : (
              <ul>
                {waste.map((w) => (
                  <li key={w.daily_stock_id} className="flex justify-between border-b border-hairline py-4 last:border-0">
                    <span className="text-lg">
                      <span className="font-extrabold text-ink">{w.name}</span>
                      <span className="ml-3 rounded-full bg-rose-100 px-3 py-1 text-base font-extrabold text-rose-800">× {w.quantity_wasted}</span>
                    </span>
                    <span className="flex gap-4">
                      <span className="font-mono text-lg font-extrabold text-rose-700">−{fmtTaka(w.cost_impact)}</span>
                      <span className="font-mono text-sm font-semibold text-body">{new Date(w.stock_date).toLocaleDateString('en-GB')}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}