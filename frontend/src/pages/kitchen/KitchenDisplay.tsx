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
  const { data: board, refresh: refreshBoard } = usePolling<BoardOrder[]>(() => apiGet('/orders/board'), 3000);
  const { data: requests, refresh: refreshRequests } = usePolling<PendingRequest[]>(() => apiGet('/kitchen/requests'), 3000);
  const { data: batches, refresh: refreshBatches } = usePolling<Batch[]>(() => apiGet('/products/batches'), 5000);
  const { data: products } = usePolling<Product[]>(() => apiGet('/products'), 10000);

  const counts = {
    new: board?.filter((o) => o.status === 'paid').length ?? 0,
    preparing: board?.filter((o) => o.status === 'preparing').length ?? 0,
    ready: board?.filter((o) => o.status === 'ready').length ?? 0,
  };

  const advance = async (id: number, status: OrderStatus) => {
    try { await apiPatch(`/orders/${id}/status`, { status }); refreshBoard(); }
    catch (e) { toast(e instanceof Error ? e.message : 'Update failed', 'error'); }
  };
  const respond = async (id: number, status: 'approved' | 'rejected', approvedQty?: number) => {
    try { await apiPatch(`/kitchen/requests/${id}`, { status, approvedQty }); refreshRequests(); }
    catch (e) { toast(e instanceof Error ? e.message : 'Update failed', 'error'); }
  };
  const setBatchStatus = async (batchId: number, status: 'available' | 'exhausted') => {
    try { await apiPatch(`/kitchen/batches/${batchId}/status`, { status }); refreshBatches(); }
    catch (e) { toast(e instanceof Error ? e.message : 'Update failed', 'error'); }
  };
  const newBatch = async (menuItemId: number) => {
    try { await apiPost('/kitchen/batches', { menuItemId, materials: [] }); refreshBatches(); toast('Batch started'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Failed to start batch', 'error'); }
  };

  const tickets = board ?? [];

  return (
    <div className="flex h-full flex-col bg-paper">
      <header className="flex h-20 items-center justify-between border-b border-hairline bg-white/70 backdrop-blur-xl px-6 z-20">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white p-2.5 rounded-2xl text-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center">
              🍽️
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-xl tracking-tight text-ink leading-none">
                Oven<span className="text-emerald-600">Fresh</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 mt-1">
                Kitchen
              </span>
            </div>
          </Link>
          <div className="h-8 w-px bg-hairline" />
          <Clock />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-emerald-100 border border-emerald-200 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-emerald-700">New</span>
            <span className="font-mono font-extrabold text-lg text-emerald-700">{counts.new}</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-orange-100 border border-orange-200 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-sm font-bold text-orange-700">Cooking</span>
            <span className="font-mono font-extrabold text-lg text-orange-700">{counts.preparing}</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-100 border border-emerald-300 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            <span className="text-sm font-bold text-emerald-800">Ready</span>
            <span className="font-mono font-extrabold text-lg text-emerald-800">{counts.ready}</span>
          </div>
          {(requests?.length ?? 0) > 0 && (
            <button
              className="animate-pulse-soft rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-1.5 text-sm font-bold text-white shadow-lg shadow-pink-500/30 hover:scale-105 transition-transform"
              onClick={() => railRef.current?.scrollIntoView({ behavior: 'smooth' })}
            >
              🔔 {requests!.length} Request{requests!.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          {tickets.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState title="All clear! 🎉" hint="New orders from the POS will appear here instantly." />
            </div>
          ) : (
            <div className="flex flex-wrap content-start gap-5">
              {tickets.map((o) => (<TicketCard key={o.order_id} order={o} onAdvance={advance} />))}
            </div>
          )}
        </main>

        <aside ref={railRef} className="w-[340px] shrink-0 space-y-6 overflow-y-auto border-l border-hairline bg-white/70 backdrop-blur-xl p-5">
          <EscalationRail requests={requests ?? []} onRespond={respond} />
          <BatchRail batches={batches ?? []} kitchenItems={(products ?? []).filter((p) => p.type === 'PREPARED')} onStatus={setBatchStatus} onNewBatch={newBatch} />
        </aside>
      </div>
    </div>
  );
}