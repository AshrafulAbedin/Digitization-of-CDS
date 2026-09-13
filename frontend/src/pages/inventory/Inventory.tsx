import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from '../../api/client';
import type { PurchaseOrderRow, RawMaterial, ReadyMadeStockRow, StockoutRow, Vendor, WasteRow } from '../../types';
import { usePolling } from '../../hooks/usePolling';
import { useToast } from '../../components/ui/Toast';
import { Clock } from '../../components/Clock';
import { RawMaterialsTab } from './RawMaterialsTab';
import { ReadyMadeStockTab } from './ReadyMadeStockTab';
import { PurchaseOrdersTab } from './PurchaseOrdersTab';
import { LossesDemandTab } from './LossesDemandTab';

type Tab = 'raw' | 'ready' | 'purchases' | 'losses';

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'raw', label: 'Raw Materials', icon: '🥕' },
  { id: 'ready', label: 'Ready-Made', icon: '🥤' },
  { id: 'purchases', label: 'Purchases', icon: '📥' },
  { id: 'losses', label: 'Losses', icon: '📉' },
];

export function Inventory() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('raw');

  const { data: materials, refresh: refreshMaterials } = usePolling<RawMaterial[]>(() => apiGet('/inventory/raw-materials'), 8000);
  const { data: readyMade, refresh: refreshReady } = usePolling<ReadyMadeStockRow[]>(() => apiGet('/inventory/ready-made-stock'), 8000);
  const { data: vendors, refresh: refreshVendors } = usePolling<Vendor[]>(() => apiGet('/inventory/vendors'), 30000);
  const { data: orders, refresh: refreshOrders } = usePolling<PurchaseOrderRow[]>(() => apiGet('/inventory/purchase-orders'), 15000);
  const { data: stockouts } = usePolling<StockoutRow[]>(() => apiGet('/inventory/stockout-log'), 15000);
  const { data: waste, refresh: refreshWaste } = usePolling<WasteRow[]>(() => apiGet('/inventory/waste-log'), 15000);

  const belowReorder =
    (materials ?? []).filter((m) => m.current_stock <= m.reorder_level).length +
    (readyMade ?? []).filter((r) => !r.expires_daily && r.current_stock <= r.reorder_level).length;

  const refreshStock = () => { refreshMaterials(); refreshReady(); refreshWaste(); refreshOrders(); refreshVendors(); };

  const initDay = async () => {
    try {
      const r = await apiPost<{ rows_created: number }>('/inventory/daily-stock/init');
      toast(`Daily stock initialized (${r.rows_created} items)`);
      refreshStock();
    } catch (e) { toast(e instanceof Error ? e.message : 'Init failed', 'error'); }
  };
  const endOfDay = async () => {
    try {
      const rows = await apiPost<{ item_name: string; quantity_wasted: number }[]>('/inventory/daily-stock/end-of-day');
      const total = rows.reduce((s, r) => s + r.quantity_wasted, 0);
      toast(`End of day: ${total} unit${total === 1 ? '' : 's'} marked as waste`);
      refreshStock();
    } catch (e) { toast(e instanceof Error ? e.message : 'End-of-day failed', 'error'); }
  };

  return (
    <div className="flex h-full flex-col bg-paper">
      <header className="flex h-20 items-center justify-between border-b border-hairline bg-white/80 backdrop-blur-xl px-6 z-20">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white p-2.5 rounded-2xl text-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center">
              🍽️
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-xl tracking-tight text-ink leading-none">
                Oven<span className="text-emerald-600">Fresh</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700 mt-1">
                Inventory
              </span>
            </div>
          </Link>
          <div className="h-8 w-px bg-hairline" />
          <Clock />
        </div>

        <div className="flex items-center gap-3">
          {belowReorder > 0 && (
            <button
              className="flex items-center gap-2 rounded-full bg-rose-100 border-2 border-rose-300 px-4 py-2 text-sm font-extrabold text-rose-800 hover:bg-rose-200 transition-colors"
              onClick={() => setTab('raw')}
            >
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              {belowReorder} low-stock
            </button>
          )}
          <button onClick={initDay} className="rounded-xl border border-hairline bg-white px-4 py-2.5 text-sm font-extrabold text-ink hover:bg-emerald-50 transition-colors">📅 Init Daily</button>
          <button onClick={endOfDay} className="rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all">🌙 End of Day</button>
        </div>
      </header>

      <nav className="border-b border-hairline bg-white/80 backdrop-blur px-6 py-4">
        <div className="inline-flex gap-1 rounded-2xl bg-surface-2 border border-hairline p-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-xl px-6 py-3 text-base font-extrabold transition-all ${
                tab === t.id
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-500/30'
                  : 'text-body hover:bg-white hover:text-ink'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="min-h-0 flex-1 overflow-y-auto p-6">
        {tab === 'raw' && <RawMaterialsTab materials={materials ?? []} />}
        {tab === 'ready' && <ReadyMadeStockTab stock={readyMade ?? []} onChanged={refreshStock} />}
        {tab === 'purchases' && (
          <PurchaseOrdersTab vendors={vendors ?? []} materials={materials ?? []} readyMade={readyMade ?? []} orders={orders ?? []} onChanged={refreshStock} />
        )}
        {tab === 'losses' && <LossesDemandTab stockouts={stockouts ?? []} waste={waste ?? []} />}
      </main>
    </div>
  );
}