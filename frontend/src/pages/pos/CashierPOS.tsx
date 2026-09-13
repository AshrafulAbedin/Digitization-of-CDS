import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from '../../api/client';
import type { Batch, BoardOrder, Customer, KitchenRequestStatus, Product } from '../../types';
import type { ParkedTicket, TicketLine } from './posTypes';
import { usePolling } from '../../hooks/usePolling';
import { useToast } from '../../components/ui/Toast';
import { Clock } from '../../components/Clock';
import { Modal } from '../../components/ui/Modal';
import { Catalog, productAvailable } from './Catalog';
import { Ticket } from './Ticket';
import { ParkedDrawer } from './ParkedDrawer';
import { PayModal } from './PayModal';

const batchDot: Record<Batch['status'], string> = {
  preparing: 'bg-gold',
  available: 'bg-kitchen',
  exhausted: 'bg-warn',
};

export function CashierPOS() {
  const toast = useToast();
  const { data: products } = usePolling<Product[]>(() => apiGet('/products'), 5000);
  const { data: batches } = usePolling<Batch[]>(() => apiGet('/products/batches'), 5000);
  const { data: board } = usePolling<BoardOrder[]>(() => apiGet('/orders/board'), 5000);
  const { data: nextTokenRow, refresh: refreshToken } = usePolling<{ next_token: number }>(
    () => apiGet('/orders/next-token'),
    10000,
  );

  const [lines, setLines] = useState<TicketLine[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [dineTakeaway, setDineTakeaway] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [payment, setPayment] = useState<'cash' | 'mobile'>('cash');
  const [parked, setParked] = useState<ParkedTicket[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [batchPopover, setBatchPopover] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [paidToken, setPaidToken] = useState<number | null>(null);
  const [paidLines, setPaidLines] = useState<TicketLine[]>([]);
  const [parkedReminder, setParkedReminder] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const customerRef = useRef<HTMLInputElement>(null);
  const nextParkedId = useRef(1);

  // Reminder banner for parked tickets waiting > 5 min.
  useEffect(() => {
    const id = setInterval(
      () => setParkedReminder(parked.some((p) => Date.now() - p.parkedAt > 5 * 60 * 1000)),
      15000,
    );
    return () => clearInterval(id);
  }, [parked]);

  const addLine = useCallback((p: Product) => {
    setLines((ls) => {
      const existing = ls.find((l) => l.product.id === p.id);
      if (existing) {
        return ls.map((l) => (l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...ls, { product: p, qty: 1 }];
    });
  }, []);

  const setQty = (productId: number, qty: number) =>
    setLines((ls) => ls.map((l) => (l.product.id === productId ? { ...l, qty } : l)));

  const removeLine = (productId: number) =>
    setLines((ls) => ls.filter((l) => l.product.id !== productId));

  // Escalation: send request, then poll until the kitchen answers.
  const escalate = async (productId: number) => {
    const line = lines.find((l) => l.product.id === productId);
    if (!line) return;
    try {
      const { request_id } = await apiPost<{ request_id: number }>('/kitchen/requests', {
        menuItemId: productId,
        requestedQty: line.qty,
      });
      setLines((ls) =>
        ls.map((l) => (l.product.id === productId ? { ...l, pendingRequestId: request_id } : l)),
      );
      const poll = setInterval(async () => {
        try {
          const r = await apiGet<KitchenRequestStatus>(`/kitchen/requests/${request_id}`);
          if (r.status === 'pending') return;
          clearInterval(poll);
          if (r.status === 'approved') {
            const approved = r.approved_quantity ?? line.qty;
            setLines((ls) =>
              ls.map((l) =>
                l.product.id === productId
                  ? { ...l, qty: approved, approvedCeiling: approved, pendingRequestId: undefined, flash: 'ok' }
                  : l,
              ),
            );
            toast(`Kitchen approved ${approved}× ${line.product.name}`);
          } else {
            setLines((ls) =>
              ls.map((l) =>
                l.product.id === productId
                  ? { ...l, qty: l.product.mode_limit, pendingRequestId: undefined, flash: 'reject' }
                  : l,
              ),
            );
            toast(`Kitchen rejected extra ${line.product.name} — reverted to limit`, 'error');
          }
          setTimeout(
            () =>
              setLines((ls) =>
                ls.map((l) => (l.product.id === productId ? { ...l, flash: undefined } : l)),
              ),
            1200,
          );
        } catch {
          /* transient poll error — keep trying */
        }
      }, 3000);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Escalation failed', 'error');
    }
  };

  const logStockout = async (p: Product, qty: number) => {
    try {
      await apiPost('/inventory/stockout', { menuItemId: p.id, quantity: qty });
      toast(`Missed demand logged: ${qty}× ${p.name}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to log', 'error');
    }
  };

  const park = () => {
    setParked((ps) => [
      ...ps,
      { id: nextParkedId.current++, lines, customer, dineTakeaway, parkedAt: Date.now() },
    ]);
    setLines([]);
    setCustomer(null);
    toast('Order parked');
  };

  const resume = (t: ParkedTicket) => {
    if (lines.length > 0) {
      toast('Finish or park the current ticket first', 'error');
      return;
    }
    setParked((ps) => ps.filter((p) => p.id !== t.id));
    setLines(t.lines);
    setCustomer(t.customer);
    setDineTakeaway(t.dineTakeaway);
    setDrawerOpen(false);
  };

  const charge = async () => {
    const blocked = lines.some(
      (l) =>
        l.pendingRequestId != null ||
        (l.product.type === 'PREPARED' && l.approvedCeiling == null && l.qty > l.product.mode_limit),
    );
    if (lines.length === 0 || blocked) return;
    
    let cid = customer?.customer_id;
    const rawInput = customerRef.current?.value.trim();

    try {
      if (!cid && rawInput) {
        const { customer_id } = await apiPost<{ customer_id: number }>('/customers/temporary', { name: rawInput });
        cid = customer_id;
      }

      const { order_id } = await apiPost<{ order_id: number }>('/orders', {
        customerId: cid ?? 1,
        paymentMethod: payment,
        dineTakeaway,
        items: lines.map((l) => ({
          menu_item_id: l.product.id,
          quantity: l.qty,
          batch_id: l.product.type === 'PREPARED' ? l.product.batch_id : null,
        })),
      });
      setPaidLines(lines);
      setPaidToken(order_id);
      setLines([]);
      setCustomer(null);
      refreshToken();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Charge failed', 'error');
    }
  };

  const closePayModal = () => {
    setPaidToken(null);
    setPaidLines([]);
    setPayment('cash');
    setDineTakeaway('dine_in');
  };

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inField = ['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName);
      if (e.key === '/' && !inField) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        customerRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (lines.length > 0) park();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (lines.length > 0) charge();
      } else if (e.key === '?' && !inField) {
        setHelpOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const preparingCount = board?.filter((o) => o.status === 'preparing').length ?? 0;
  const todaysOrders =
    (nextTokenRow?.next_token ?? 1) - 1; /* order ids are sequential from setup */

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 items-center justify-between border-b border-[#e7e2da] bg-white px-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-bold text-ink hover:underline">
            OvenFresh
          </Link>
          <Clock />
        </div>
        <div className="flex items-center gap-5 text-sm text-label">
          <span>
            <span className="tabular font-semibold text-ink">{todaysOrders}</span> orders
          </span>
          <span>
            <span className="tabular font-semibold text-ink">{preparingCount}</span> preparing
          </span>
          <div className="relative">
            <button
              className="rounded-lg px-2 py-1 hover:bg-black/5"
              onClick={() => setBatchPopover((v) => !v)}
            >
              <span className="tabular font-semibold text-ink">{batches?.length ?? 0}</span> active
              batches
            </button>
            {batchPopover && (
              <div className="absolute top-full right-0 z-30 mt-1 w-64 rounded-xl border border-[#e7e2da] bg-white p-2 shadow-lg">
                {(batches ?? []).map((b) => (
                  <div key={b.id} className="flex items-center gap-2 px-2 py-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${batchDot[b.status]}`} />
                    <span className="font-mono text-sm text-body">#{b.id}</span>
                    <span className="flex-1 truncate text-sm text-body">{b.name}</span>
                    <span className="text-xs text-label">{b.status}</span>
                  </div>
                ))}
                {(batches ?? []).length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-label">No active batches</div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-[#d9d4cc] px-2.5 py-1 text-sm text-label hover:border-ink"
            onClick={() => setHelpOpen(true)}
            aria-label="Keyboard shortcuts"
          >
            ?
          </button>
          <button
            className="relative rounded-lg border border-[#d9d4cc] px-3 py-1.5 text-sm font-medium text-body hover:border-ink"
            onClick={() => setDrawerOpen(true)}
          >
            Parked
            {parked.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-xs font-bold text-white">
                {parked.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <Catalog
          products={(products ?? []).filter((p) => p)}
          onAdd={(p) => (productAvailable(p) ? addLine(p) : undefined)}
          onStockout={logStockout}
          searchRef={searchRef}
        />
        <Ticket
          nextToken={nextTokenRow?.next_token ?? null}
          lines={lines}
          customer={customer}
          dineTakeaway={dineTakeaway}
          payment={payment}
          parkedReminder={parkedReminder}
          onCustomer={setCustomer}
          onDineTakeaway={setDineTakeaway}
          onPayment={setPayment}
          onQty={setQty}
          onRemove={removeLine}
          onEscalate={escalate}
          onPark={park}
          onCharge={charge}
          customerInputRef={customerRef}
        />
      </div>

      <ParkedDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} parked={parked} onResume={resume} />
      <PayModal token={paidToken} lines={paidLines} payment={payment} onClose={closePayModal} />

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Keyboard shortcuts">
        <dl className="space-y-2 text-sm">
          {[
            ['/', 'Focus search'],
            ['F2', 'Customer field'],
            ['F4', 'Park order'],
            ['F9', 'Charge'],
            ['Esc', 'Close modal'],
          ].map(([k, d]) => (
            <div key={k} className="flex items-center justify-between">
              <dt className="rounded-md border border-[#d9d4cc] bg-paper px-2 py-0.5 font-mono">{k}</dt>
              <dd className="text-body">{d}</dd>
            </div>
          ))}
        </dl>
      </Modal>
    </div>
  );
}
