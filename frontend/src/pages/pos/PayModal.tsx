import type { TicketLine } from './posTypes';
import { Modal } from '../../components/ui/Modal';

interface PayModalProps {
  token: number | null;
  lines: TicketLine[];
  payment: 'cash' | 'mobile';
  onClose: () => void;
}

export function PayModal({ token, lines, payment, onClose }: PayModalProps) {
  const total = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);

  return (
    <Modal open={token !== null} onClose={onClose}>
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
          {payment === 'cash' ? 'Paid in Cash' : 'Paid by Mobile'}
        </p>
        <p className="mt-3 font-display text-sm font-bold uppercase tracking-widest text-orange-400">
          Token
        </p>
        <p className="mt-1 font-mono text-7xl font-extrabold text-white leading-none">
          {token}
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
          <ul className="space-y-2">
            {lines.map((l) => (
              <li
                key={l.product.id}
                className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0"
              >
                <span className="text-sm text-slate-300">
                  <span className="font-mono font-bold text-white">{l.qty}×</span>{' '}
                  {l.product.name}
                </span>
                <span className="font-mono text-sm font-bold text-orange-400">
                  ৳{l.product.price * l.qty}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between border-t border-dashed border-white/10 pt-3">
            <span className="text-sm font-bold uppercase tracking-wider text-slate-500">
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </span>
            <span className="font-mono text-2xl font-extrabold text-white">
              <span className="text-orange-400 text-lg">৳</span>
              {total}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all"
        >
          Done — Next Order
        </button>
      </div>
    </Modal>
  );
}