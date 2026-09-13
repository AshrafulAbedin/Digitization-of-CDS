import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from '../../api/client';
import type { ProfitReport, TopRequested, TopSeller } from '../../types';
import { fmtTaka } from '../../types';
import { usePolling } from '../../hooks/usePolling';
import { Segmented } from '../../components/ui/Segmented';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { BarChart, BarList, Card, MixBar } from './charts';

type Range = 'today' | '7d' | '30d';
const rangeDays: Record<Range, number> = { today: 1, '7d': 7, '30d': 30 };

const iso = (d: Date) => d.toISOString().slice(0, 10);

function windowFor(range: Range, back = 0) {
  const days = rangeDays[range];
  const end = new Date();
  end.setDate(end.getDate() - back * days);
  const start = new Date(end);
  if (range !== 'today') {
    start.setDate(start.getDate() - (days - 1));
  }
  return { start: iso(start), end: iso(end) };
}

export function OwnerDashboard() {
  const [range, setRange] = useState<Range>('7d');
  const [sellersBy, setSellersBy] = useState<'portions' | 'revenue'>('portions');

  const fetchAll = useCallback(async () => {
    const days = rangeDays[range];
    const cur = windowFor(range);
    
    const [profitRows, wasteCostRes, sales, topSellers, paymentMix, serviceMix, topRequested, vendors, peakHours] =
      await Promise.all([
        apiGet<ProfitReport[]>(`/analytics/profit?start=${cur.start}&end=${cur.end}`),
        apiGet<{cost: number}>(`/analytics/waste-cost?start=${cur.start}&end=${cur.end}`),
        apiGet<{day: string; orders: number; revenue: number}[]>(`/analytics/sales-by-day?start=${cur.start}&end=${cur.end}`),
        apiGet<TopSeller[]>(`/analytics/top-sellers?limit=10&days=${days}`),
        apiGet<{payment_method: string; order_count: number; total: number}[]>(`/analytics/payment-mix?start=${cur.start}&end=${cur.end}`),
        apiGet<{service_type: string; order_count: number; total: number}[]>(`/analytics/service-mix?start=${cur.start}&end=${cur.end}`),
        apiGet<TopRequested[]>(`/analytics/top-requested?limit=10&days=${days}`),
        apiGet<{vendor_id: number; vendor_name: string; po_count: number; total_spend: number}[]>('/analytics/vendor-performance'),
        apiGet<{hour_of_day: number; order_count: number; total_revenue: number}[]>(`/analytics/peak-hours?days=${days}`),
      ]);
      
    return {
      profit: profitRows[0],
      wasteCost: Number(wasteCostRes?.cost ?? 0),
      sales,
      topSellers,
      paymentMix,
      serviceMix,
      topRequested,
      vendors,
      peakHours
    };
  }, [range]);

  const { data } = usePolling(fetchAll, 5000);

  const revenue = data?.profit?.total_revenue ?? 0;
  const cost = data?.profit?.total_cost ?? 0;
  const profit = data?.profit?.total_profit ?? 0;
  const wasteCost = data?.wasteCost ?? 0;
  
  const orderCount = data?.sales.reduce((s, d) => s + Number(d.orders), 0) ?? 0;
  const avgOrder = orderCount > 0 ? revenue / orderCount : 0;

  const salesBars = data?.sales.map((d) => ({
    label: new Date(d.day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    value: Number(d.revenue),
  })) ?? [];

  const peakBars = data?.peakHours.map((d) => ({
    label: `${d.hour_of_day}:00`,
    value: Number(d.order_count),
    originalHour: d.hour_of_day,
  })) ?? [];

  const peakHourItem = peakBars.length > 0 ? peakBars.reduce((a, b) => a.value > b.value ? a : b) : null;
  const peakHourText = peakHourItem ? `${peakHourItem.originalHour > 12 ? peakHourItem.originalHour - 12 : peakHourItem.originalHour}${peakHourItem.originalHour >= 12 ? 'pm' : 'am'}` : '';

  const cashData = data?.paymentMix.find(p => p.payment_method === 'cash');
  const mobileData = data?.paymentMix.find(p => p.payment_method === 'mobile');
  
  const dineInData = data?.serviceMix.find(p => p.service_type === 'dine_in');
  const takeawayData = data?.serviceMix.find(p => p.service_type === 'takeaway');

  const tiles = [
    {
      label: 'Revenue',
      value: fmtTaka(revenue),
      sub: `${orderCount} orders`,
      cls: 'col-span-2 text-ink',
      large: true,
    },
    {
      label: 'Cost',
      value: fmtTaka(cost),
      cls: 'col-span-1 text-ink',
      large: false,
    },
    ...(range === 'today'
      ? []
      : [
          {
            label: 'Profit',
            value: fmtTaka(profit),
            cls: 'col-span-1 ' + (profit >= 0 ? 'text-kitchen' : 'text-warn'),
            large: false,
          },
        ]),
    {
      label: 'Avg Order',
      value: fmtTaka(avgOrder),
      cls: 'col-span-1 text-ink',
      large: false,
    },
    {
      label: 'Waste Cost',
      value: fmtTaka(wasteCost),
      cls: 'col-span-1 text-warn',
      large: false,
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 items-center justify-between border-b border-[#e7e2da] bg-white px-4">
        <Link to="/" className="text-lg font-bold text-ink hover:underline">
          Dashboard
        </Link>
        <Segmented<Range>
          options={[
            { value: 'today', label: 'Today' },
            { value: '7d', label: '7 days' },
            { value: '30d', label: '30 days' },
          ]}
          value={range}
          onChange={setRange}
        />
        <Button variant="ghost" size="sm" onClick={() => { alert('Export omitted for brief'); }}>
          Export report
        </Button>
      </header>

      <main className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className={`grid gap-4 ${range === 'today' ? 'grid-cols-5' : 'grid-cols-6'}`}>
          {tiles.map((t) => (
            <div key={t.label} className={`rounded-xl border border-[#e7e2da] bg-white p-4 ${t.cls}`}>
              <div className="text-sm text-label">{t.label}</div>
              <div className={`tabular mt-1 ${t.large ? 'font-bold text-5xl' : 'font-bold text-3xl'}`}>
                {t.value}
              </div>
              {t.sub && <div className="mt-1 text-sm text-label">{t.sub}</div>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Sales over time">
            {salesBars.length === 0 ? (
              <EmptyState title="No sales in range" />
            ) : (
              <BarChart bars={salesBars} />
            )}
          </Card>

          <Card title="Top sellers">
            <div className="mb-3">
              <Segmented<'portions' | 'revenue'>
                options={[
                  { value: 'portions', label: 'By portions' },
                  { value: 'revenue', label: 'By revenue' },
                ]}
                value={sellersBy}
                onChange={setSellersBy}
              />
            </div>
            {(data?.topSellers.length ?? 0) === 0 ? (
              <EmptyState title="No sales in range" />
            ) : (
              <BarList
                rows={(data?.topSellers ?? []).map((s) => ({
                  name: s.item_name,
                  value: sellersBy === 'portions' ? Number(s.total_quantity) : Number(s.total_revenue),
                  detail: sellersBy === 'portions' ? fmtTaka(s.total_revenue) : `${s.total_quantity} portions`,
                }))}
                valueLabel={(v) => (sellersBy === 'portions' ? `${v} portions` : fmtTaka(v))}
              />
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Payment mix">
            <MixBar
              a={Number(cashData?.order_count ?? 0)}
              b={Number(mobileData?.order_count ?? 0)}
              labelA="Cash"
              labelB="Mobile"
            />
          </Card>
          <Card title="Dine-in vs takeaway">
            <MixBar
              a={Number(dineInData?.order_count ?? 0)}
              b={Number(takeawayData?.order_count ?? 0)}
              labelA="Dine-in"
              labelB="Takeaway"
              hueA="#1a1a1a"
              hueB="#2e7d32"
            />
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Missed demand" sub="Restock candidates — what we could have sold.">
            {(data?.topRequested.length ?? 0) === 0 ? (
              <EmptyState title="No stockout requests" />
            ) : (
              <BarList
                rows={(data?.topRequested ?? []).map((r) => ({
                  name: r.item_name,
                  value: Number(r.total_requests),
                }))}
                valueLabel={(v) => `${v} requests`}
                urgencyMode={true}
              />
            )}
          </Card>

          <Card title="Vendor purchasing">
            {(data?.vendors.length ?? 0) === 0 ? (
              <EmptyState title="No purchases in range" />
            ) : (
              <table className="w-full text-sm leading-[1.8]">
                <thead>
                  <tr className="border-b border-[#e7e2da] text-left text-label">
                    <th className="py-1.5 font-medium">Vendor</th>
                    <th className="py-1.5 text-right font-medium">POs</th>
                    <th className="py-1.5 text-right font-medium">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.vendors ?? []).map((v, i) => (
                    <tr key={v.vendor_id} className={`border-b border-[#f1ede7] last:border-0 ${i === 0 ? 'bg-kitchen/10' : ''}`}>
                      <td className="py-1.5 px-2 text-body font-medium">{v.vendor_name}</td>
                      <td className="tabular py-1.5 px-2 text-right text-body">{v.po_count}</td>
                      <td className="tabular py-1.5 px-2 text-right font-medium text-ink">
                        {fmtTaka(v.total_spend)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Peak hours" sub={peakHourText ? `Peak: ${peakHourText}` : ''}>
            {peakBars.length === 0 ? (
              <EmptyState title="No orders in range" />
            ) : (
              <BarChart bars={peakBars} money={false} />
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
