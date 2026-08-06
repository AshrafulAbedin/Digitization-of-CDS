import { useState } from 'react';
import type { PendingRequest } from '../../types';
import { Stepper } from '../../components/ui/Stepper';
import { Button } from '../../components/ui/Button';

interface EscalationRailProps {
  requests: PendingRequest[];
  onRespond: (id: number, status: 'approved' | 'rejected', approvedQty?: number) => void;
}

function RequestCard({ r, onRespond }: { r: PendingRequest; onRespond: EscalationRailProps['onRespond'] }) {
  const [qty, setQty] = useState(r.requested_quantity);
  const ageMin = Math.max(0, Math.floor((Date.now() - new Date(r.requested_at).getTime()) / 60000));
  return (
    <div className="rounded-xl border border-gold/60 bg-white p-3">
      <div className="font-semibold text-ink">{r.menu_item_name}</div>
      <div className="mt-0.5 text-sm text-label">
        {r.order_id ? `Token #${r.order_id}` : 'POS'} wants{' '}
        <strong className="text-ink">{r.requested_quantity}</strong> · {ageMin}m ago
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <Stepper value={qty} min={1} max={r.requested_quantity} onChange={setQty} small />
        <div className="flex gap-1.5">
          <Button size="sm" variant="success" onClick={() => onRespond(r.request_id, 'approved', qty)}>
            Approve
          </Button>
          <Button size="sm" variant="danger" onClick={() => onRespond(r.request_id, 'rejected')}>
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EscalationRail({ requests, onRespond }: EscalationRailProps) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-ink">
        Requests
        {requests.length > 0 && (
          <span className="ml-2 rounded-full bg-warn px-2 py-0.5 text-sm font-bold text-white">
            {requests.length}
          </span>
        )}
      </h2>
      <div className="space-y-2">
        {requests.length === 0 && <p className="text-sm text-label">No pending requests.</p>}
        {requests.map((r) => (
          <RequestCard key={r.request_id} r={r} onRespond={onRespond} />
        ))}
      </div>
    </section>
  );
}
