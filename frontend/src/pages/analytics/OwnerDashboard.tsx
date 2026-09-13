import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from '../../api/client';
import type { OrdersSummary, ProfitReport, TopRequested, TopSeller, WasteRow } from '../../types';
import { fmtTaka } from '../../types';
import { usePolling } from '../../hooks/usePolling';
import { Segmented } from '../../components/ui/Segmented';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { BarChart, BarList, Card, DeltaChip, MixBar } from './charts';

type Range = 'today' | '7d' | '30d';
const rangeDays: Record<Range, number> = { today: 1, '7d': 7, '30d': 30 };

const iso = (d: Date) => d.toISOString().slice(0, 10);

function windowFor(range: Range, back = 0) {
  const days = rangeDays[range];
  const end = new Date();
  end.setDate(end.getDate() - back * days);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return { start: iso(start), end: iso(end) };
}

interface Payload {
  profit: ProfitReport | undefined;
  prevProfit: ProfitReport | undefined;
  summary: OrdersSummary;
  prevSummary: OrdersSummary;
  topSellers: TopSeller[];
  topRequested: TopRequested[];
  waste: WasteRow[];
}

export function OwnerDashboard() {
  const [range, setRange] = useState<Range>('7d');
  const [sellersBy, setSellersBy] = useState<'portions' | 'revenue'>('portions');

  const fetchAll = useCallback(async (): Promise<Payload> => {
    const days = rangeDays[range];
    const cur = windowFor(range);
    const prev = windowFor(range, 1);
    const [profitRows, prevProfitRows, summary, prevSummary, topSellers, topRequested, waste] =
      await Promise.all([
        apiGet<ProfitReport[]>(`/analytics/profit?start=${cur.start}&end=${cur.end}`),
        apiGet<ProfitReport[]>(`/analytics/profit?start=${prev.start}&end=${prev.end}`),
        apiGet<OrdersSummary>(`/analytics/orders-summary?start=${cur.start}&end=${cur.end}`),
        apiGet<OrdersSummary>(`/analytics/orders-summary?start=${prev.start}&end=${prev.end}`),
        apiGet<TopSeller[]>(`/analytics/top-sellers?limit=5&days=${days}`),
        apiGet<TopRequested[]>(`/analytics/top-requested?limit=5&days=${days}`),
        apiGet<WasteRow[]>('/inventory/waste-log'),
      ]);
    return {
      profit: profitRows[0],
      prevProfit: prevProfitRows[0],
      summary,
      prevSummary,
      topSellers,
      topRequested,
      waste: waste.filter((w) => w.stock_date.slice(0, 10) >= cur.start),
    };
  }, [range]);

  const { data } = usePolling<Payload>(fetchAll, 5000);

  const orderCount = data?.summary.byDay.reduce((s, d) => s + Number(d.orders), 0) ?? 0;
  const prevOrderCount = data?.prevSummary.byDay.reduce((s, d) => s + Number(d.orders), 0) ?? 0;
  const revenue = data?.profit?.total_revenue ?? 0;
  const prevRevenue = data?.prevProfit?.total_revenue ?? 0;
  const profit = data?.profit?.total_profit ?? 0;
  const prevProfit = data?.prevProfit?.total_profit ?? 0;
  const wasteCost = data?.waste.reduce((s, w) => s + Number(w.cost_impact), 0) ?? 0;
  const avgOrder = orderCount > 0 ? revenue / orderCount : 0;
  const prevAvgOrder = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0;

  const bars =
    data?.summary.byDay.map((d) => ({
      label: new Date(d.day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      value: Number(d.revenue),
    })) ?? [];

  const cost = data?.profit?.total_cost ?? 0;
  const prevCost = data?.prevProfit?.total_cost ?? 0;

  const tiles = [
    {
      label: 'Net sales',
      value: fmtTaka(revenue),
      sub: `${orderCount} orders`,
      chip: <DeltaChip now={revenue} prev={prevRevenue} />,
      cls: 'text-ink',
      width: 'col-span-2 row-span-1',
      large: true,
    },
    {
      label: 'Cost',
      value: fmtTaka(cost),
      sub: 'ingredients + waste',
      chip: <DeltaChip now={cost} prev={prevCost} goodWhenDown />,
      cls: 'text-ink',
    },
    ...(range === 'today'
      ? []
      : [
          {
            label: 'Est. profit',
            value: fmtTaka(profit),
            sub: 'after ingredient + waste cost',
            chip: <DeltaChip now={profit} prev={prevProfit} />,
            cls: profit >= 0 ? 'text-kitchen' : 'text-warn',
          },
        ]),
    {
      label: 'Average order',
      value: fmtTaka(avgOrder),
      sub: `${data?.summary.mix.abandoned ?? 0} abandoned`,
      chip: <DeltaChip now={avgOrder} prev={prevAvgOrder} />,
      cls: 'text-ink',
    },
    {
      label: 'Waste cost',
      value: fmtTaka(wasteCost),
      sub: `${data?.waste.length ?? 0} incidents`,
      chip: null,
      cls: 'text-warn',
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const csv = [
              ['Metric', 'Value'],
              ['Revenue', revenue],
              ['Cost', data?.profit?.total_cost ?? 0],
              ['Profit', profit],
              ['Orders', orderCount],
              ['Avg Order', avgOrder],
              ['Waste Cost', wasteCost],
            ]
              .map((r) => r.join(','))
              .join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics-export-${range}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export report
        </Button>
      </header>

      <main className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className={`rounded-xl border border-[#e7e2da] bg-white p-4 ${t.width || ''}`}>
              <div className="text-sm text-label">{t.label}</div>
              <div className={`tabular mt-1 font-bold ${t.cls} ${t.large ? 'text-4xl' : 'text-2xl'}`}>
                {t.value}
                {t.chip}
              </div>
              <div className="mt-1 text-sm text-label">{t.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Sales over time">
            {bars.length === 0 ? (
              <EmptyState title="No sales in range" hint="Charge orders at the POS to see sales here." />
            ) : (
              <BarChart bars={bars} />
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
                  detail:
                    sellersBy === 'portions'
                      ? fmtTaka(s.total_revenue)
                      : `${s.total_quantity} portions`,
                }))}
                valueLabel={(v) => (sellersBy === 'portions' ? `${v} portions` : fmtTaka(v))}
              />
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Payment mix">
            <MixBar
              a={Number(data?.summary.mix.cash ?? 0)}
              b={Number(data?.summary.mix.mobile ?? 0)}
              labelA="Cash"
              labelB="Mobile"
            />
          </Card>
          <Card title="Dine-in vs takeaway">
            <MixBar
              a={Number(data?.summary.mix.dine_in ?? 0)}
              b={Number(data?.summary.mix.takeaway ?? 0)}
              labelA="Dine-in"
              labelB="Takeaway"
            />
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Missed demand" sub="Restock candidates — what we could have sold.">
            {(data?.topRequested.length ?? 0) === 0 ? (
              <EmptyState
                title="No stockout requests"
                hint="Cashiers log missed demand from the POS when an item is out."
              />
            ) : (
              <BarList
                rows={(data?.topRequested ?? []).map((r) => ({
                  name: r.item_name,
                  value: Number(r.total_requests),
                }))}
                hue="#c98a2e"
                valueLabel={(v) => `${v} requests`}
                urgencyMode={true}
              />
            )}
          </Card>

          <Card title="Vendor purchasing">
            {(data?.summary.vendors.length ?? 0) === 0 ? (
              <EmptyState title="No purchases in range" hint="Receive purchases in Inventory → Purchase Orders." />
            ) : (
              <>
                <table className="w-full text-sm leading-[1.8]">
                  <thead>
                    <tr className="border-b border-[#e7e2da] text-left text-label">
                      <th className="py-1.5 font-medium">Vendor</th>
                      <th className="py-1.5 text-right font-medium">POs</th>
                      <th className="py-1.5 text-right font-medium">Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.summary.vendors ?? []).map((v) => (
                      <tr key={v.vendor_id} className="border-b border-[#f1ede7] last:border-0">
                        <td className="py-1.5 text-body">{v.name}</td>
                        <td className="tabular py-1.5 text-right text-body">{v.po_count}</td>
                        <td className="tabular py-1.5 text-right font-medium text-ink">
                          {fmtTaka(v.total_spend)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2 text-right text-sm font-semibold text-ink">
                  Total{' '}
                  <span className="tabular">
                    {fmtTaka((data?.summary.vendors ?? []).reduce((s, v) => s + Number(v.total_spend), 0))}
                  </span>
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Card title="Tomorrow's Stock Recommendation" sub="Calculated based on recent demand patterns.">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="primary"
                onClick={async () => {
                  try {
                    const res = await apiPost<{ recommendation: { name: string; suggested_qty: number; type: string }[] }>('/analytics/stock-recommendation');
                    alert('Recommendation: \n' + res.recommendation.map(r => `${r.name}: ${r.suggested_qty} (${r.type})`).join('\n'));
                  } catch (e) {
                    alert('Failed to get recommendation');
                  }
                }}
              >
                Generate Recommendation
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
