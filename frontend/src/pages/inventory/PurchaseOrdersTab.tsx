import { useState } from 'react';
import type { PurchaseOrderRow, RawMaterial, ReadyMadeStockRow, Vendor } from '../../types';
import { fmtTaka } from '../../types';
import { apiPost } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import { EmptyState } from '../../components/ui/EmptyState';

interface DraftLine { item_type: 'raw_material' | 'ready_made'; item_id: number; item_name: string; quantity: number; unit_cost: number; }
interface Props { vendors: Vendor[]; materials: RawMaterial[]; readyMade: ReadyMadeStockRow[]; orders: PurchaseOrderRow[]; onChanged: () => void; }

const inputCls = 'h-12 rounded-xl border border-hairline bg-white px-4 text-base font-bold text-ink outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all';

export function PurchaseOrdersTab({ vendors, materials, readyMade, orders, onChanged }: Props) {
  const toast = useToast();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [vendorId, setVendorId] = useState<number | ''>('');
  const [newVendorOpen, setNewVendorOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [lineType, setLineType] = useState<'raw_material' | 'ready_made'>('raw_material');
  const [lineItem, setLineItem] = useState<number | ''>('');
  const [lineQty, setLineQty] = useState('');
  const [lineCost, setLineCost] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filterVendor, setFilterVendor] = useState<number | ''>('');

  const itemChoices = lineType === 'raw_material'
    ? materials.map((m) => ({ id: m.raw_material_id, name: m.name }))
    : readyMade.map((r) => ({ id: r.menu_item_id, name: r.name }));

  const grandTotal = lines.reduce((s, l) => s + l.quantity * l.unit_cost, 0);
  const lineValid = lineItem !== '' && Number(lineQty) > 0 && Number(lineCost) > 0;

  const addLine = () => {
    if (!lineValid) return;
    const item = itemChoices.find((i) => i.id === lineItem)!;
    setLines((ls) => [...ls, { item_type: lineType, item_id: item.id, item_name: item.name, quantity: Number(lineQty), unit_cost: Number(lineCost) }]);
    setLineItem(''); setLineQty(''); setLineCost('');
  };

  const addVendor = async () => {
    try {
      const v = await apiPost<{ vendor_id: number }>('/inventory/vendors', { name: newVendorName, phone: newVendorPhone || null });
      toast(`Vendor added: ${newVendorName}`);
      setNewVendorOpen(false); setNewVendorName(''); setNewVendorPhone(''); setVendorId(v.vendor_id); onChanged();
    } catch (e) { toast(e instanceof Error ? e.message : 'Failed to add vendor', 'error'); }
  };

  const receive = async () => {
    try {
      await apiPost('/inventory/purchase-orders', { vendorId, lines });
      toast('Purchase received — stock and average cost updated');
      setLines([]); setVendorId(''); setBuilderOpen(false); onChanged();
    } catch (e) { toast(e instanceof Error ? e.message : 'Failed to receive purchase', 'error'); }
  };

  const shownOrders = filterVendor === '' ? orders : orders.filter((o) => o.vendor_id === filterVendor);
  const totalSpent = shownOrders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-5">
        <StatCard icon="📥" label="Total POs" value={String(shownOrders.length)} tone="from-emerald-200/70 to-transparent" accent="text-emerald-700" />
        <StatCard icon="💸" label="Total Spent" value={fmtTaka(totalSpent)} tone="from-orange-200/70 to-transparent" accent="text-orange-600" />
        <StatCard icon="🏪" label="Vendors" value={String(vendors.length)} tone="from-emerald-300/70 to-transparent" accent="text-emerald-700" />
      </div>

      {!builderOpen ? (
        <button
          onClick={() => setBuilderOpen(true)}
          className="rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 px-8 py-4 text-lg font-extrabold text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:scale-[1.02] transition-all"
        >
          + New Purchase Order
        </button>
      ) : (
        <div className="rounded-3xl border-2 border-emerald-300 bg-emerald-50/60 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-2xl font-extrabold text-ink flex items-center gap-3">
              <span className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white p-2 rounded-xl text-lg">📥</span>
              New Purchase
            </h3>
            <button onClick={() => setBuilderOpen(false)} className="text-label hover:text-rose-500 text-2xl leading-none font-extrabold">✕</button>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select value={vendorId} onChange={(e) => setVendorId(Number(e.target.value))} className={`${inputCls} min-w-64`}>
              <option value="">Select vendor…</option>
              {vendors.map((v) => (<option key={v.vendor_id} value={v.vendor_id}>{v.name}</option>))}
            </select>
            <button className="rounded-xl bg-emerald-200 px-5 py-3 text-base font-extrabold text-emerald-900 hover:bg-emerald-300 transition-colors" onClick={() => setNewVendorOpen((v) => !v)}>+ New Vendor</button>
            {newVendorOpen && (
              <>
                <input value={newVendorName} onChange={(e) => setNewVendorName(e.target.value)} placeholder="Vendor name" className={inputCls} />
                <input value={newVendorPhone} onChange={(e) => setNewVendorPhone(e.target.value)} placeholder="Phone" className={inputCls} />
                <button disabled={!newVendorName} onClick={addVendor} className="rounded-xl bg-ink px-5 py-3 text-base font-extrabold text-white shadow-md disabled:opacity-50">Save</button>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 border border-hairline">
            <select value={lineType} onChange={(e) => { setLineType(e.target.value as DraftLine['item_type']); setLineItem(''); }} className={inputCls}>
              <option value="raw_material">🥕 Raw material</option>
              <option value="ready_made">🥤 Ready-made</option>
            </select>
            <select value={lineItem} onChange={(e) => setLineItem(Number(e.target.value))} className={`${inputCls} min-w-56`}>
              <option value="">Select item…</option>
              {itemChoices.map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}
            </select>
            <input value={lineQty} onChange={(e) => setLineQty(e.target.value)} placeholder="Qty" type="number" min="0" className={`${inputCls} w-28`} />
            <input value={lineCost} onChange={(e) => setLineCost(e.target.value)} placeholder="Cost ৳" type="number" min="0" className={`${inputCls} w-32`} />
            <button disabled={!lineValid} onClick={addLine} className="rounded-xl bg-ink px-5 py-3 text-base font-extrabold text-white shadow-md disabled:opacity-50">+ Add line</button>
          </div>

          {lines.length > 0 && (
            <div className="mt-5 rounded-2xl border border-hairline bg-white overflow-hidden">
              {lines.map((l, i) => (
                <div key={i} className="flex items-center justify-between border-b border-hairline px-5 py-4 last:border-0">
                  <span className="text-base">
                    <span className="font-extrabold text-ink text-lg">{l.item_name}</span>
                    <span className="ml-3 text-base font-semibold text-body">· {l.quantity} × {fmtTaka(l.unit_cost)}</span>
                    <span className="ml-3 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold uppercase text-emerald-800">{l.item_type === 'raw_material' ? 'raw' : 'ready'}</span>
                  </span>
                  <span className="flex items-center gap-4">
                    <span className="font-mono text-xl font-extrabold text-orange-600">{fmtTaka(l.quantity * l.unit_cost)}</span>
                    <button className="text-label hover:text-rose-500 text-xl font-extrabold" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>✕</button>
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between bg-emerald-100 px-5 py-4">
                <span className="font-display text-xl font-extrabold text-ink">Total</span>
                <span className="font-mono text-2xl font-extrabold text-emerald-800">{fmtTaka(grandTotal)}</span>
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center gap-4">
            <button disabled={vendorId === '' || lines.length === 0} onClick={receive} className="rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 px-7 py-3.5 text-lg font-extrabold text-white shadow-lg shadow-orange-500/30 disabled:opacity-40 disabled:shadow-none transition-all">
              ✓ Receive Purchase
            </button>
            <span className="text-base font-semibold text-body">Adds stock and recalculates weighted average cost.</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl font-extrabold text-ink">Purchase History</h3>
        <select value={filterVendor} onChange={(e) => setFilterVendor(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls}>
          <option value="">All vendors</option>
          {vendors.map((v) => (<option key={v.vendor_id} value={v.vendor_id}>{v.name}</option>))}
        </select>
      </div>

      {shownOrders.length === 0 ? (
        <EmptyState title="No purchases yet" hint="Received purchases appear here." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-hairline bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-hairline bg-emerald-100/70 text-left">
                <th className="px-6 py-5 text-sm font-extrabold uppercase tracking-widest text-ink">PO #</th>
                <th className="px-6 py-5 text-sm font-extrabold uppercase tracking-widest text-ink">Date</th>
                <th className="px-6 py-5 text-sm font-extrabold uppercase tracking-widest text-ink">Vendor</th>
                <th className="px-6 py-5 text-sm font-extrabold uppercase tracking-widest text-ink">Items</th>
                <th className="px-6 py-5 text-right text-sm font-extrabold uppercase tracking-widest text-ink">Total</th>
              </tr>
            </thead>
            <tbody>
              {shownOrders.map((o) => (
                <>
                  <tr key={o.purchase_order_id} className="cursor-pointer border-b border-hairline hover:bg-emerald-100/40 transition-colors" onClick={() => setExpanded((e) => (e === o.purchase_order_id ? null : o.purchase_order_id))}>
                    <td className="px-6 py-5 font-mono font-extrabold text-ink text-lg">#{o.purchase_order_id}</td>
                    <td className="px-6 py-5 text-lg font-semibold text-body">{new Date(o.order_date).toLocaleDateString('en-GB')}</td>
                    <td className="px-6 py-5 font-extrabold text-ink text-lg">{o.vendor_name}</td>
                    <td className="max-w-80 truncate px-6 py-5 text-base font-semibold text-body">{(o.lines ?? []).map((l) => l.item_name).join(', ')}</td>
                    <td className="px-6 py-5 text-right font-mono text-xl font-extrabold text-orange-600">{fmtTaka(o.total_amount)}</td>
                  </tr>
                  {expanded === o.purchase_order_id && (
                    <tr key={`${o.purchase_order_id}-detail`} className="border-b border-hairline bg-emerald-50/60">
                      <td colSpan={5} className="px-10 py-5">
                        {(o.lines ?? []).map((l, i) => (
                          <div key={i} className="flex justify-between py-2 text-base">
                            <span className="text-body">
                              <span className="font-extrabold text-ink text-lg">{l.item_name}</span>
                              <span className="ml-3 rounded-full bg-white px-3 py-1 text-xs font-extrabold uppercase text-body border border-hairline">{l.item_type}</span>
                            </span>
                            <span className="font-mono font-semibold text-body text-base">
                              {l.quantity} × {fmtTaka(l.unit_cost)} = <strong className="text-emerald-800 font-extrabold">{fmtTaka(l.quantity * l.unit_cost)}</strong>
                            </span>
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, tone, accent }: { icon: string; label: string; value: string; tone: string; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-hairline bg-white p-6 shadow-sm hover:shadow-md transition-all">
      <div className={`absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br ${tone} blur-2xl`} />
      <div className="relative z-10">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100 text-2xl">{icon}</div>
        <p className="mt-4 text-sm font-extrabold uppercase tracking-widest text-body">{label}</p>
        <p className={`font-mono text-5xl font-extrabold mt-1 ${accent}`}>{value}</p>
      </div>
    </div>
  );
}