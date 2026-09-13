import { useState } from 'react';
import type { PendingRequest } from '../../types';
import { Stepper } from '../../components/ui/Stepper';

interface EscalationRailProps {
  requests: PendingRequest[];
  onRespond: (id: number, status: 'approved' | 'rejected', approvedQty?: number) => void;
}

export function EscalationRail({ requests, onRespond }: EscalationRailProps) {
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [approveQty, setApproveQty] = useState(1);

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-hairline bg-white/60 p-6 text-center">
        <p className="text-sm font-semibold text-body">No pending requests ✅</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
        <span className="bg-gradient-to-br from-pink-500 to-rose-500 text-white p-1.5 rounded-lg text-xs">🔔</span>
        Kitchen Requests
      </h3>

      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.request_id} className="rounded-2xl border border-pink-200 bg-pink-50 p-4 shadow-sm">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <p className="font-display font-bold text-ink leading-tight">{r.menu_item_name}</p>
                <p className="text-xs text-body mt-1 font-medium">Order #{r.order_id ?? '—'} · Requested {r.requested_quantity}×</p>
              </div>
              <span className="animate-pulse rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">New</span>
            </div>

            {approvingId === r.request_id ? (
              <div className="mt-3 flex flex-col gap-2 rounded-xl bg-white p-3 border border-hairline">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-body">Approve Qty:</span>
                  <Stepper value={approveQty} min={1} max={99} onChange={setApproveQty} small />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setApprovingId(null)} className="flex-1 rounded-lg bg-surface-2 py-1.5 text-xs font-bold text-body hover:bg-emerald-50">Cancel</button>
                  <button onClick={() => { onRespond(r.request_id, 'approved', approveQty); setApprovingId(null); }} className="flex-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 py-1.5 text-xs font-bold text-white shadow-sm">Confirm</button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <button onClick={() => onRespond(r.request_id, 'rejected')} className="flex-1 rounded-xl bg-white border border-hairline py-2 text-xs font-bold text-body hover:bg-rose-50 hover:text-rose-700 transition-colors">Reject</button>
                <button onClick={() => { setApprovingId(r.request_id); setApproveQty(r.requested_quantity); }} className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 py-2 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all">Approve</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}