import type { RefObject } from 'react';
import type { Customer } from '../../types';
import type { TicketLine } from './posTypes';
import { Stepper } from '../../components/ui/Stepper';

interface TicketProps {
  nextToken: number | null;
  lines: TicketLine[];
  customer: Customer | null;
  dineTakeaway: 'dine_in' | 'takeaway';
  payment: 'cash' | 'mobile';
  parkedReminder: boolean;
  onCustomer: (c: Customer | null) => void;
  onDineTakeaway: (v: 'dine_in' | 'takeaway') => void;
  onPayment: (v: 'cash' | 'mobile') => void;
  onQty: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
  onEscalate: (id: number) => void;
  onPark: () => void;
  onCharge: () => void;
  customerInputRef: RefObject<HTMLInputElement | null>;
}

export function Ticket({
  nextToken, lines, customer, dineTakeaway, payment, parkedReminder,
  onCustomer, onDineTakeaway, onPayment, onQty, onRemove, onEscalate, onPark, onCharge, customerInputRef,
}: TicketProps) {
  const total = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);

  return (
    <div className="flex w-[400px] shrink-0 flex-col border-l border-hairline bg-white/95 backdrop-blur-xl">
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-pink-500 to-orange-500 p-5 text-white">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest opacity-90">Current Ticket</p>
            <h2 className="font-display text-4xl font-extrabold mt-1">{nextToken ? `#${nextToken}` : '—'}</h2>
          </div>
          <span className="rounded-full bg-white/30 px-3.5 py-1.5 text-sm font-extrabold backdrop-blur">
            👤 {customer?.name ?? 'Guest'}
          </span>
        </div>

        <div className="relative mt-4 flex gap-1 rounded-2xl bg-white/20 p-1 backdrop-blur">
          <button
            onClick={() => onDineTakeaway('dine_in')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-extrabold uppercase tracking-wider transition-all ${
              dineTakeaway === 'dine_in' ? 'bg-white text-orange-600 shadow-sm' : 'text-white/85 hover:bg-white/15'
            }`}
          >
            🍽️ Dine In
          </button>
          <button
            onClick={() => onDineTakeaway('takeaway')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-extrabold uppercase tracking-wider transition-all ${
              dineTakeaway === 'takeaway' ? 'bg-white text-orange-600 shadow-sm' : 'text-white/85 hover:bg-white/15'
            }`}
          >
            🥡 Takeaway
          </button>
        </div>
      </div>

      {parkedReminder && (
        <div className="mx-4 mt-3 rounded-xl bg-amber-100 border-2 border-amber-300 p-3 text-sm font-extrabold text-amber-800 animate-pulse">
          ⚠️ You have parked tickets waiting!
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 text-6xl opacity-30">🛒</div>
            <p className="text-lg font-bold text-body">Ticket is empty</p>
            <p className="mt-1 text-sm font-medium text-label">Tap items on the left to add them</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lines.map((l) => (
              <div key={l.product.id} className="group relative flex flex-col gap-2 rounded-2xl border border-hairline bg-white p-4 transition-all hover:border-emerald-400 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate font-display font-extrabold text-base text-ink">{l.product.name}</h4>
                    <p className="font-mono text-sm text-orange-600 font-bold mt-0.5">৳{l.product.price} each</p>
                  </div>
                  <p className="font-mono font-extrabold text-lg text-ink">৳{l.product.price * l.qty}</p>
                  <button onClick={() => onRemove(l.product.id)} className="text-label hover:text-rose-500 text-xl leading-none transition-colors font-bold">&times;</button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Stepper value={l.qty} small min={1} onChange={(v) => onQty(l.product.id, v)} />
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    {l.pendingRequestId && <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">Asking…</span>}
                    {l.flash === 'ok' && <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">Approved ✓</span>}
                    {l.flash === 'reject' && <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-extrabold text-rose-700">Rejected</span>}
                    {l.product.type === 'PREPARED' && l.qty > l.product.mode_limit && !l.approvedCeiling && !l.pendingRequestId && (
                      <button
                        onClick={() => onEscalate(l.product.id)}
                        className="rounded-lg bg-amber-100 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-800 transition-colors hover:bg-amber-200"
                      >
                        Ask Kitchen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-hairline bg-surface-2/80 p-4 space-y-4">
        <div className="flex gap-2">
          <input
            ref={customerInputRef}
            type="text"
            placeholder="Customer phone... (F2)"
            className="flex-1 rounded-xl border border-hairline bg-white px-3.5 py-3 text-base font-medium text-ink placeholder-label outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all"
          />
          <button className="rounded-xl bg-white border border-hairline px-4 py-3 text-sm font-extrabold text-ink hover:bg-emerald-50 transition-colors">Find</button>
        </div>

        <div className="flex gap-2 rounded-xl bg-white border border-hairline p-1">
          <button
            onClick={() => onPayment('cash')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-extrabold uppercase tracking-wider transition-all ${
              payment === 'cash' ? 'bg-emerald-500 text-white shadow-sm' : 'text-label hover:bg-emerald-50'
            }`}
          >
            💵 Cash
          </button>
          <button
            onClick={() => onPayment('mobile')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-extrabold uppercase tracking-wider transition-all ${
              payment === 'mobile' ? 'bg-emerald-500 text-white shadow-sm' : 'text-label hover:bg-emerald-50'
            }`}
          >
            📱 Mobile
          </button>
        </div>

        <div className="flex items-end justify-between border-t-2 border-dashed border-hairline pt-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-label">Total</p>
            <p className="font-mono text-5xl font-extrabold text-ink leading-none mt-1">
              <span className="text-orange-500 text-3xl">৳</span>{total}
            </p>
          </div>
          <div className="text-right">
            <p className="text-base font-extrabold text-ink">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onPark}
            disabled={lines.length === 0}
            className="rounded-xl bg-white border border-hairline px-4 py-3.5 text-base font-extrabold text-ink hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            🅿️ Park
          </button>
          <button
            onClick={onCharge}
            disabled={lines.length === 0}
            className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 py-3.5 text-base font-extrabold text-white shadow-lg shadow-orange-500/40 hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all"
          >
            CHARGE ৳{total}
          </button>
        </div>
      </div>
    </div>
  );
}