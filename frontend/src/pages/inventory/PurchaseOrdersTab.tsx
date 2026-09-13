import { useState } from 'react';
import type { PurchaseOrderRow, RawMaterial, ReadyMadeStockRow, Vendor } from '../../types';
import { fmtTaka } from '../../types';
import { apiPost } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { EmptyState } from '../../components/ui/EmptyState';

interface DraftLine {
  item_type: 'raw_material' | 'ready_made';
  item_id: number;
  item_name: string;
  quantity: number;
  unit_cost: number;
}

interface Props {
  vendors: Vendor[];
  materials: RawMaterial[];
  readyMade: ReadyMadeStockRow[];
  orders: PurchaseOrderRow[];
  onChanged: () => void;
}

const inputCls =
  'h-9 rounded-lg border border-[#d9d4cc] bg-white px-2 text-sm outline-none focus:border-gold';

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

  const itemChoices =
    lineType === 'raw_material'
      ? materials.map((m) => ({ id: m.raw_material_id, name: m.name }))
      : readyMade.map((r) => ({ id: r.menu_item_id, name: r.name }));

  const grandTotal = lines.reduce((s, l) => s + l.quantity * l.unit_cost, 0);
  const lineValid = lineItem !== '' && Number(lineQty) > 0 && Number(lineCost) > 0;

  const addLine = () => {
    if (!lineValid) return;
    const item = itemChoices.find((i) => i.id === lineItem)!;
    setLines((ls) => [
      ...ls,
      { item_type: lineType, item_id: item.id, item_name: item.name, quantity: Number(lineQty), unit_cost: Number(lineCost) },
    ]);
    setLineItem('');
    setLineQty('');
    setLineCost('');
  };

  const addVendor = async () => {
    try {
      const v = await apiPost<{ vendor_id: number }>('/inventory/vendors', {
        name: newVendorName,
        phone: newVendorPhone || null,
      });
      toast(`Vendor added: ${newVendorName}`);
      setNewVendorOpen(false);
      setNewVendorName('');
      setNewVendorPhone('');
      setVendorId(v.vendor_id);
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to add vendor', 'error');
    }
  };

  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const receive = async () => {
    setSubmitError(null);
    try {
      await apiPost('/inventory/purchase-orders', { vendorId, lines, notes });
      toast('Purchase received — stock and average cost updated');
      setLines([]);
      setVendorId('');
      setNotes('');
      setBuilderOpen(false);
      onChanged();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to receive purchase');
    }
  };

  const shownOrders = filterVendor === '' ? orders : orders.filter((o) => o.vendor_id === filterVendor);

  return (
    <div className="space-y-4">
      {!builderOpen ? (
        <Button variant="primary" onClick={() => setBuilderOpen(true)}>
          New purchase
        </Button>
      ) : (
        <div className="rounded-xl border border-[#e7e2da] bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink">New purchase</h3>
            <Button size="sm" variant="ghost" onClick={() => setBuilderOpen(false)}>
              ✕
            </Button>
          </div>
          
          {submitError && (
            <div className="mt-3 rounded bg-warn/10 p-3 text-sm font-medium text-warn">
              {submitError}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select value={vendorId} onChange={(e) => setVendorId(Number(e.target.value))} className={inputCls}>
              <option value="">Select vendor…</option>
              {vendors.map((v) => (
                <option key={v.vendor_id} value={v.vendor_id}>
                  {v.name}
                </option>
              ))}
            </select>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className={`${inputCls} flex-1`} />
            <button className="text-sm font-medium text-[#8a6a3a] underline whitespace-nowrap" onClick={() => setNewVendorOpen((v) => !v)}>
              + new vendor
            </button>
            {newVendorOpen && (
              <div className="flex items-center gap-2 w-full mt-2">
                <input value={newVendorName} onChange={(e) => setNewVendorName(e.target.value)} placeholder="Vendor name" className={inputCls} />
                <input value={newVendorPhone} onChange={(e) => setNewVendorPhone(e.target.value)} placeholder="Phone" className={inputCls} />
                <Button size="sm" variant="secondary" disabled={!newVendorName} onClick={addVendor}>
                  Save
                </Button>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-2">
            <select
              value={lineType}
              onChange={(e) => {
                setLineType(e.target.value as DraftLine['item_type']);
                setLineItem('');
              }}
              className={inputCls}
            >
              <option value="raw_material">Raw material</option>
              <option value="ready_made">Ready-made</option>
            </select>
            <select value={lineItem} onChange={(e) => setLineItem(Number(e.target.value))} className={`${inputCls} min-w-40`}>
              <option value="">Item…</option>
              {itemChoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <input value={lineQty} onChange={(e) => setLineQty(e.target.value)} placeholder="Qty" type="number" min="0" className={`${inputCls} w-20`} />
            <input value={lineCost} onChange={(e) => setLineCost(e.target.value)} placeholder="Unit cost ৳" type="number" min="0" className={`${inputCls} w-28`} />
            <Button size="sm" variant="secondary" disabled={!lineValid} onClick={addLine}>
              Add line
            </Button>
          </div>

          {lines.length > 0 && (
            <div className="mt-3 rounded-lg border border-[#f1ede7]">
              {lines.map((l, i) => (
                <div key={i} className="flex items-center justify-between border-b border-[#f1ede7] px-3 py-1.5 text-sm last:border-0">
                  <span className="text-body">
                    {l.item_name} · {l.quantity} × {fmtTaka(l.unit_cost)}
                    <span className="ml-1 text-xs text-label">({l.item_type === 'raw_material' ? 'raw' : 'ready'})</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tabular font-medium text-ink">{fmtTaka(l.quantity * l.unit_cost)}</span>
                    <button className="text-label hover:text-warn" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                      ✕
                    </button>
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="font-semibold text-ink">Total</span>
                <span className="tabular text-lg font-bold text-ink">{fmtTaka(grandTotal)}</span>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3 border-t border-[#e7e2da] pt-4">
            <Button variant="primary" disabled={vendorId === '' || lines.length === 0} onClick={receive}>
              Submit Purchase Order
            </Button>
            <Button variant="ghost" onClick={() => setBuilderOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ink">History</h3>
        <select value={filterVendor} onChange={(e) => setFilterVendor(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls}>
          <option value="">All vendors</option>
          {vendors.map((v) => (
            <option key={v.vendor_id} value={v.vendor_id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      {shownOrders.length === 0 ? (
        <EmptyState title="No purchases yet" hint="Received purchases appear here with full line detail." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#e7e2da] bg-white">
          <table className="w-full text-sm leading-[1.8]">
            <thead>
              <tr className="border-b border-[#e7e2da] text-left text-label">
                <th className="px-4 py-2.5 font-medium">PO #</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Vendor</th>
                <th className="px-4 py-2.5 font-medium">Lines</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {shownOrders.map((o) => (
                <>
                  <tr
                    key={o.purchase_order_id}
                    className="cursor-pointer border-b border-[#f1ede7] hover:bg-paper/60"
                    onClick={() => setExpanded((e) => (e === o.purchase_order_id ? null : o.purchase_order_id))}
                  >
                    <td className="tabular px-4 py-2 font-mono">#{o.purchase_order_id}</td>
                    <td className="px-4 py-2">{new Date(o.order_date).toLocaleDateString('en-GB')}</td>
                    <td className="px-4 py-2">{o.vendor_name}</td>
                    <td className="max-w-64 truncate px-4 py-2 text-label">
                      {(o.lines ?? []).map((l) => l.item_name).join(', ')}
                    </td>
                    <td className="tabular px-4 py-2 text-right font-medium text-ink">{fmtTaka(o.total_amount)}</td>
                  </tr>
                  {expanded === o.purchase_order_id && (
                    <tr key={`${o.purchase_order_id}-detail`} className="border-b border-[#f1ede7] bg-paper/50">
                      <td colSpan={5} className="px-6 py-2">
                        {(o.lines ?? []).map((l, i) => (
                          <div key={i} className="flex justify-between py-0.5 text-sm">
                            <span className="text-body">
                              {l.item_name} <span className="text-xs text-label">({l.item_type})</span>
                            </span>
                            <span className="tabular text-body">
                              {l.quantity} × {fmtTaka(l.unit_cost)} = {fmtTaka(l.quantity * l.unit_cost)}
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
