import React, { useState, useEffect } from 'react';
import type { PurchaseOrderRow, RawMaterial, ReadyMadeStockRow, Vendor } from '../../types';
import { fmtTaka } from '../../types';
import { apiPost } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';

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
  prefill: { item_type: 'raw_material' | 'ready_made'; item_id: number } | null;
  clearPrefill: () => void;
  onChanged: () => void;
}

const inputCls =
  'h-9 rounded-lg border border-[#d9d4cc] bg-white px-2 text-sm outline-none focus:border-gold';

export function PurchaseOrdersTab({ vendors, materials, readyMade, orders, prefill, clearPrefill, onChanged }: Props) {
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
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (prefill) {
      setBuilderOpen(true);
      setLineType(prefill.item_type);
      setLineItem(prefill.item_id === 0 ? '' : prefill.item_id);
    }
  }, [prefill]);

  const handleClose = () => {
    setBuilderOpen(false);
    clearPrefill();
  };

  const itemChoices =
    lineType === 'raw_material'
      ? materials.map((m) => ({ id: m.raw_material_id, name: m.name }))
      : readyMade.map((r) => ({ id: r.menu_item_id, name: r.name }));

  const grandTotal = lines.reduce((s, l) => s + l.quantity * l.unit_cost, 0);
  const lineValid = lineItem !== '' && Number(lineQty) > 0 && Number(lineCost) >= 0;

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

  const receive = async () => {
    try {
      await apiPost('/inventory/purchase-orders', { vendorId, lines, notes });
      toast('Purchase order saved');
      setLines([]);
      setVendorId('');
      setNotes('');
      handleClose();
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to receive purchase', 'error');
    }
  };

  const shownOrders = filterVendor === '' ? orders : orders.filter((o) => o.vendor_id === filterVendor);

  return (
    <div className="space-y-4">
      <Button variant="primary" onClick={() => setBuilderOpen(true)}>
        + New Purchase
      </Button>

      <Modal open={builderOpen} onClose={handleClose} title="New Purchase Order">
        <div className="mt-3 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
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
          </div>

          {newVendorOpen && (
            <div className="flex items-center gap-2 w-full">
              <input value={newVendorName} onChange={(e) => setNewVendorName(e.target.value)} placeholder="Vendor name" className={inputCls} />
              <input value={newVendorPhone} onChange={(e) => setNewVendorPhone(e.target.value)} placeholder="Phone" className={inputCls} />
              <Button size="sm" variant="secondary" disabled={!newVendorName} onClick={addVendor}>
                Save
              </Button>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-[#e7e2da] pt-4">
            <select
              value={lineType}
              onChange={(e) => {
                setLineType(e.target.value as DraftLine['item_type']);
                setLineItem('');
              }}
              className={inputCls}
            >
              <option value="raw_material">Raw Material</option>
              <option value="ready_made">Ready-Made</option>
            </select>
            <select value={lineItem} onChange={(e) => setLineItem(Number(e.target.value))} className={`${inputCls} min-w-40 flex-1`}>
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
              + Add Line
            </Button>
          </div>

          {lines.length > 0 && (
            <div className="rounded-lg border border-[#f1ede7] bg-paper/50">
              {lines.map((l, i) => (
                <div key={i} className="flex items-center justify-between border-b border-[#f1ede7] px-3 py-1.5 text-sm last:border-0">
                  <span className="text-body">
                    {l.item_name} · {l.quantity} × {fmtTaka(l.unit_cost)}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tabular font-medium text-ink">{fmtTaka(l.quantity * l.unit_cost)}</span>
                    <button className="text-label hover:text-warn" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                      ✕
                    </button>
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2 bg-white rounded-b-lg">
                <span className="font-semibold text-ink">Grand Total</span>
                <span className="tabular text-lg font-bold text-ink">{fmtTaka(grandTotal)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" disabled={vendorId === '' || lines.length === 0} onClick={receive}>
              Submit
            </Button>
          </div>
        </div>
      </Modal>

      <div className="flex items-center justify-between mt-8">
        <h3 className="text-lg font-semibold text-ink">Purchase History</h3>
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
                <React.Fragment key={o.purchase_order_id}>
                  <tr
                    className="cursor-pointer border-b border-[#f1ede7] hover:bg-paper/60"
                    onClick={() => setExpanded((e) => (e === o.purchase_order_id ? null : o.purchase_order_id))}
                  >
                    <td className="tabular px-4 py-2 font-mono">#{o.purchase_order_id}</td>
                    <td className="px-4 py-2">{new Date(o.order_date).toLocaleDateString('en-GB')}</td>
                    <td className="px-4 py-2">{o.vendor_name}</td>
                    <td className="max-w-64 truncate px-4 py-2 text-label">
                      {(o.lines ?? []).map((l) => l.item_name).join(', ')}
                    </td>
                    <td className="tabular px-4 py-2 text-right font-medium text-ink">{fmtTaka(o.total_amount)}
                      <span className="inline-block w-4 text-center ml-1">{expanded === o.purchase_order_id ? '▲' : '▼'}</span>
                    </td>
                  </tr>
                  {expanded === o.purchase_order_id && (
                    <tr className="border-b border-[#f1ede7] bg-paper/50">
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
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
