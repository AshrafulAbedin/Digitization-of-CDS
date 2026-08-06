import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from '../../api/client';
import type { PurchaseOrderRow, RawMaterial, ReadyMadeStockRow, StockoutRow, Vendor, WasteRow } from '../../types';
import { usePolling } from '../../hooks/usePolling';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { RawMaterialsTab } from './RawMaterialsTab';
import { ReadyMadeStockTab } from './ReadyMadeStockTab';
import { PurchaseOrdersTab } from './PurchaseOrdersTab';
import { LossesDemandTab } from './LossesDemandTab';

type Tab = 'raw' | 'ready' | 'purchases' | 'losses';

const tabs: { id: Tab; label: string }[] = [
  { id: 'raw', label: 'Raw Materials' },
  { id: 'ready', label: 'Ready-Made Stock' },
  { id: 'purchases', label: 'Purchase Orders' },
  { id: 'losses', label: 'Losses & Demand' },
];

export function Inventory() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('raw');

  const { data: materials, refresh: refreshMaterials } = usePolling<RawMaterial[]>(
    () => apiGet('/inventory/raw-materials'),
    8000,
  );
  const { data: readyMade, refresh: refreshReady } = usePolling<ReadyMadeStockRow[]>(
    () => apiGet('/inventory/ready-made-stock'),
    8000,
  );
  const { data: vendors, refresh: refreshVendors } = usePolling<Vendor[]>(
    () => apiGet('/inventory/vendors'),
    30000,
  );
  const { data: orders, refresh: refreshOrders } = usePolling<PurchaseOrderRow[]>(
    () => apiGet('/inventory/purchase-orders'),
    15000,
  );
  const { data: stockouts } = usePolling<StockoutRow[]>(() => apiGet('/inventory/stockout-log'), 15000);
  const { data: waste, refresh: refreshWaste } = usePolling<WasteRow[]>(
    () => apiGet('/inventory/waste-log'),
    15000,
  );

  const belowReorder =
    (materials ?? []).filter((m) => m.current_stock <= m.reorder_level).length +
    (readyMade ?? []).filter((r) => !r.expires_daily && r.current_stock <= r.reorder_level).length;

  const refreshStock = () => {
    refreshMaterials();
    refreshReady();
    refreshWaste();
    refreshOrders();
    refreshVendors();
  };

  const initDay = async () => {
    try {
      const r = await apiPost<{ rows_created: number }>('/inventory/daily-stock/init');
      toast(`Daily stock initialized (${r.rows_created} items)`);
      refreshStock();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Init failed', 'error');
    }
  };

  const endOfDay = async () => {
    try {
      const rows = await apiPost<{ item_name: string; quantity_wasted: number }[]>(
        '/inventory/daily-stock/end-of-day',
      );
      const total = rows.reduce((s, r) => s + r.quantity_wasted, 0);
      toast(`End of day: ${total} unit${total === 1 ? '' : 's'} marked as waste`);
      refreshStock();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'End-of-day failed', 'error');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 items-center justify-between border-b border-[#e7e2da] bg-white px-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-lg font-bold text-ink hover:underline">
            Inventory
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {belowReorder > 0 && (
            <button
              className="rounded-full bg-[#f4e9d8] px-3 py-1 text-sm font-medium text-[#8a6a3a]"
              onClick={() => setTab('raw')}
            >
              {belowReorder} item{belowReorder > 1 ? 's' : ''} below reorder level
            </button>
          )}
          <Button size="sm" variant="secondary" onClick={initDay}>
            Init daily stock
          </Button>
          <Button size="sm" variant="secondary" onClick={endOfDay}>
            End of day
          </Button>
        </div>
      </header>

      <nav className="flex gap-1 border-b border-[#e7e2da] bg-white px-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id ? 'border-gold text-ink' : 'border-transparent text-label hover:text-body'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'raw' && <RawMaterialsTab materials={materials ?? []} />}
        {tab === 'ready' && <ReadyMadeStockTab stock={readyMade ?? []} onChanged={refreshStock} />}
        {tab === 'purchases' && (
          <PurchaseOrdersTab
            vendors={vendors ?? []}
            materials={materials ?? []}
            readyMade={readyMade ?? []}
            orders={orders ?? []}
            onChanged={refreshStock}
          />
        )}
        {tab === 'losses' && <LossesDemandTab stockouts={stockouts ?? []} waste={waste ?? []} />}
      </main>
    </div>
  );
}
