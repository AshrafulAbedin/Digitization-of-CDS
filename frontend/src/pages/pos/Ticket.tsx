import type { Customer } from '../../types';
import { fmtTaka } from '../../types';
import type { TicketLine } from './posTypes';
import { Segmented } from '../../components/ui/Segmented';
import { Stepper } from '../../components/ui/Stepper';
import { Button } from '../../components/ui/Button';
import { CustomerStrip } from './CustomerStrip';

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
  onQty: (productId: number, qty: number) => void;
  onRemove: (productId: number) => void;
  onEscalate: (productId: number) => void;
  onPark: () => void;
  onCharge: () => void;
  customerInputRef: React.RefObject<HTMLInputElement | null>;
}

export function Ticket(props: TicketProps) {
  const {
    nextToken, lines, customer, dineTakeaway, payment, parkedReminder,
    onCustomer, onDineTakeaway, onPayment, onQty, onRemove, onEscalate,
    onPark, onCharge, customerInputRef,
  } = props;

  const total = lines.reduce((s, l) => s + l.qty * l.product.price, 0);
  const anyPending = lines.some((l) => l.pendingRequestId != null);
  const needsSend = (l: TicketLine) =>
    l.product.type === 'PREPARED' &&
    l.pendingRequestId == null &&
    l.approvedCeiling == null &&
    l.qty > l.product.mode_limit;
  const anyUnsent = lines.some(needsSend);
  const disabledReason =
    lines.length === 0
      ? 'Cart empty'
      : anyPending
        ? 'Awaiting kitchen…'
        : anyUnsent
          ? 'Ask kitchen first'
          : null;

  return (
    <aside className="flex w-[38%] min-w-[360px] flex-col border-l border-[#e7e2da] bg-white">
      {parkedReminder && (
        <div className="bg-[#f4e9d8] px-4 py-2 text-sm text-[#8a6a3a]">
          A parked order has been waiting over 5 minutes.
        </div>
      )}

      <div className="flex items-center justify-between border-b border-[#e7e2da] px-4 py-3">
        <div>
          <div className="text-sm text-label">Next token</div>
          <div className="tabular font-mono text-2xl font-bold text-ink">
            #{nextToken ?? '—'}
          </div>
        </div>
        <Segmented<'dine_in' | 'takeaway'>
          options={[
            { value: 'dine_in', label: 'Dine-in' },
            { value: 'takeaway', label: 'Takeaway' },
          ]}
          value={dineTakeaway}
          onChange={onDineTakeaway}
        />
      </div>

      <div className="border-b border-[#e7e2da] px-4 py-3">
        <CustomerStrip customer={customer} onCustomer={onCustomer} inputRef={customerInputRef} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        {lines.length === 0 && (
          <p className="py-10 text-center text-sm text-label">Click items to add them to the ticket.</p>
        )}
        {lines.map((l) => {
          const stepMax =
            l.pendingRequestId != null ? l.qty : (l.approvedCeiling ?? (l.product.type === 'PREPARED' ? 99 : l.product.stock ?? 99));
          return (
            <div
              key={l.product.id}
              className={`flex items-center gap-3 border-b border-[#f1ede7] py-2.5 last:border-0 transition-colors ${
                l.flash === 'ok' ? 'bg-kitchen/10' : l.flash === 'reject' ? 'bg-warn/10' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-body">{l.product.name}</div>
                <div className="tabular text-sm text-label">{fmtTaka(l.product.price)} each</div>
                {l.pendingRequestId != null && (
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-[#8a6a3a]">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gold border-t-transparent" />
                    Awaiting kitchen…
                  </div>
                )}
                {needsSend(l) && (
                  <button
                    className="mt-0.5 rounded-md bg-[#f4e9d8] px-2 py-0.5 text-sm font-medium text-[#8a6a3a] hover:brightness-95"
                    onClick={() => onEscalate(l.product.id)}
                  >
                    Ask kitchen for {l.qty} →
                  </button>
                )}
              </div>
              <Stepper
                value={l.qty}
                min={1}
                max={stepMax}
                onChange={(v) => onQty(l.product.id, v)}
                small
              />
              <div className="tabular w-16 text-right font-semibold text-ink">
                {fmtTaka(l.qty * l.product.price)}
              </div>
              <button
                className="text-label hover:text-warn"
                onClick={() => onRemove(l.product.id)}
                aria-label={`Remove ${l.product.name}`}
                disabled={l.pendingRequestId != null}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <div className="border-t border-[#e7e2da] px-4 py-3">
        <div className="flex items-center justify-between text-sm text-label">
          <span>Subtotal</span>
          <span className="tabular">{fmtTaka(total)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-lg font-semibold text-ink">Total</span>
          <span className="tabular text-2xl font-bold text-ink">{fmtTaka(total)}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Segmented<'cash' | 'mobile'>
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'mobile', label: 'Mobile banking' },
            ]}
            value={payment}
            onChange={onPayment}
          />
          {anyPending && (
            <Button variant="secondary" size="sm" onClick={onPark}>
              Park order
            </Button>
          )}
        </div>
        <Button
          variant="primary"
          size="lg"
          className="mt-3 w-full"
          disabled={disabledReason != null}
          onClick={onCharge}
        >
          {disabledReason ?? `Charge ${fmtTaka(total)}`}
        </Button>
      </div>
    </aside>
  );
}
