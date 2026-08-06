import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPatch, apiPost } from '../../api/client';
import type { Batch, BoardOrder, OrderStatus, PendingRequest, Product } from '../../types';
import { usePolling } from '../../hooks/usePolling';
import { useToast } from '../../components/ui/Toast';
import { Clock } from '../../components/Clock';
import { EmptyState } from '../../components/ui/EmptyState';
import { TicketCard } from './TicketCard';
import { EscalationRail } from './EscalationRail';
import { BatchRail } from './BatchRail';

export function KitchenDisplay() {
  const toast = useToast();
  const railRef = useRef<HTMLDivElement>(null);
  const { data: board, refresh: refreshBoard } = usePolling<BoardOrder[]>(
    () => apiGet('/orders/board'),
    3000,
  );
  const { data: requests, refresh: refreshRequests } = usePolling<PendingRequest[]>(
    () => apiGet('/kitchen/requests'),
    3000,
  );
  const { data: batches, refresh: refreshBatches } = usePolling<Batch[]>(
    () => apiGet('/products/batches'),
    5000,
  );
  const { data: products } = usePolling<Product[]>(() => apiGet('/products'), 10000);

  const counts = {
    new: board?.filter((o) => o.status === 'paid').length ?? 0,
    preparing: board?.filter((o) => o.status === 'preparing').length ?? 0,
    ready: board?.filter((o) => o.status === 'ready').length ?? 0,
  };

  const advance = async (id: number, status: OrderStatus) => {
    try {
      await apiPatch(`/orders/${id}/status`, { status });
      refreshBoard();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed', 'error');
    }
  };

  const respond = async (id: number, status: 'approved' | 'rejected', approvedQty?: number) => {
    try {
      await apiPatch(`/kitchen/requests/${id}`, { status, approvedQty });
      refreshRequests();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed', 'error');
    }
  };

  const setBatchStatus = async (batchId: number, status: 'available' | 'exhausted') => {
    try {
      await apiPatch(`/kitchen/batches/${batchId}/status`, { status });
      refreshBatches();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed', 'error');
    }
  };

  const newBatch = async (menuItemId: number) => {
    try {
      await apiPost('/kitchen/batches', { menuItemId, materials: [] });
      refreshBatches();
      toast('Batch started — POS shows “Cooking…”');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to start batch', 'error');
    }
  };

  const tickets = board ?? [];

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 items-center justify-between border-b border-[#e7e2da] bg-white px-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-lg font-bold text-ink hover:underline">
            Kitchen
          </Link>
          <Clock />
        </div>
        <div className="flex items-center gap-5 text-base">
          <span className="text-[#3d5a8a]">
            New <strong className="tabular">{counts.new}</strong>
          </span>
          <span className="text-[#8a6a3a]">
            Preparing <strong className="tabular">{counts.preparing}</strong>
          </span>
          <span className="text-kitchen">
            Ready <strong className="tabular">{counts.ready}</strong>
          </span>
          {(requests?.length ?? 0) > 0 && (
            <button
              className="animate-pulse-soft rounded-full bg-warn px-3 py-1 text-sm font-bold text-white"
              onClick={() => railRef.current?.scrollIntoView({ behavior: 'smooth' })}
            >
              {requests!.length} request{requests!.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto p-4">
          {tickets.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState title="No open tickets" hint="New orders from the POS appear here." />
            </div>
          ) : (
            <div className="flex flex-wrap content-start gap-4">
              {tickets.map((o) => (
                <TicketCard key={o.order_id} order={o} onAdvance={advance} />
              ))}
            </div>
          )}
        </main>

        <aside
          ref={railRef}
          className="w-[320px] shrink-0 space-y-6 overflow-y-auto border-l border-[#e7e2da] bg-white p-4"
        >
          <EscalationRail requests={requests ?? []} onRespond={respond} />
          <BatchRail
            batches={batches ?? []}
            kitchenItems={(products ?? []).filter((p) => p.type === 'PREPARED')}
            onStatus={setBatchStatus}
            onNewBatch={newBatch}
          />
        </aside>
      </div>
    </div>
  );
}
