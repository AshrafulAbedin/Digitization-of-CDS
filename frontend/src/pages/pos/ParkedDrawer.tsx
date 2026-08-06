import type { ParkedTicket } from './posTypes';
import { fmtTaka } from '../../types';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

interface ParkedDrawerProps {
  open: boolean;
  onClose: () => void;
  parked: ParkedTicket[];
  onResume: (t: ParkedTicket) => void;
}

function chip(t: ParkedTicket) {
  if (t.lines.some((l) => l.flash === 'reject'))
    return <span className="rounded-full bg-warn/15 px-2 py-0.5 text-xs font-medium text-warn">Rejected</span>;
  if (t.lines.some((l) => l.pendingRequestId != null))
    return <span className="rounded-full bg-[#f4e9d8] px-2 py-0.5 text-xs font-medium text-[#8a6a3a]">Waiting on kitchen</span>;
  return <span className="rounded-full bg-kitchen/10 px-2 py-0.5 text-xs font-medium text-kitchen">Ready to resume</span>;
}

export function ParkedDrawer({ open, onClose, parked, onResume }: ParkedDrawerProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/25" />
      <aside className="absolute top-0 right-0 flex h-full w-[380px] flex-col bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-[#e7e2da] px-4 py-3">
          <h2 className="text-lg font-semibold text-ink">Parked orders</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            ✕
          </Button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {parked.length === 0 && (
            <EmptyState title="Nothing parked" hint="Park a ticket while it waits on a kitchen approval." />
          )}
          {parked.map((t) => {
            const total = t.lines.reduce((s, l) => s + l.qty * l.product.price, 0);
            const ageMin = Math.floor((Date.now() - t.parkedAt) / 60000);
            return (
              <div key={t.id} className="rounded-xl border border-[#e7e2da] p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">{t.customer?.name ?? 'Guest'}</span>
                  {chip(t)}
                </div>
                <div className="mt-1 truncate text-sm text-label">
                  {t.lines.map((l) => `${l.qty}× ${l.product.name}`).join(', ')}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="tabular text-sm text-label">
                    {fmtTaka(total)} · {ageMin < 1 ? 'just now' : `${ageMin} min ago`}
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => onResume(t)}>
                    Resume
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
