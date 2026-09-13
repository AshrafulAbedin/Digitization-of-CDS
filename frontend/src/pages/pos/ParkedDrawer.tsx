import type { ParkedTicket } from './posTypes';
import { Clock } from '../../components/Clock';

interface ParkedDrawerProps {
  open: boolean;
  onClose: () => void;
  parked: ParkedTicket[];
  onResume: (t: ParkedTicket) => void;
}

export function ParkedDrawer({ open, onClose, parked, onResume }: ParkedDrawerProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 z-50 flex h-full w-[420px] flex-col border-l border-white/10 bg-[#0b1220]/95 backdrop-blur-2xl shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-white">Parked Tickets</h2>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-slate-500">
              {parked.length} waiting
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {parked.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 text-5xl opacity-20">🅿️</div>
              <p className="text-sm font-semibold text-slate-400">No parked tickets</p>
              <p className="mt-1 text-xs text-slate-500">
                Park an order with F4 while you finish something else.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {parked.map((t) => {
                const total = t.lines.reduce((s, l) => s + l.product.price * l.qty, 0);
                const itemCount = t.lines.reduce((s, l) => s + l.qty, 0);
                const minutesAgo = Math.floor((Date.now() - t.parkedAt) / 60000);
                const urgent = minutesAgo >= 5;

                return (
                  <div
                    key={t.id}
                    className={`rounded-2xl border p-4 backdrop-blur transition-all ${
                      urgent
                        ? 'border-amber-500/40 bg-amber-500/[0.06]'
                        : 'border-white/10 bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-white">
                            #{t.id}
                          </span>
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {t.dineTakeaway === 'dine_in' ? 'Dine in' : 'Takeaway'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {t.customer?.name ?? 'Guest'} · {itemCount} item{itemCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-lg font-extrabold text-orange-400">
                          ৳{total}
                        </p>
                        <p
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            urgent ? 'text-amber-400' : 'text-slate-500'
                          }`}
                        >
                          {minutesAgo}m ago
                        </p>
                      </div>
                    </div>

                    <ul className="mt-3 space-y-1">
                      {t.lines.slice(0, 3).map((l) => (
                        <li
                          key={l.product.id}
                          className="flex justify-between text-xs text-slate-400"
                        >
                          <span>
                            <span className="font-mono text-white">{l.qty}×</span>{' '}
                            {l.product.name}
                          </span>
                          <span className="font-mono">৳{l.product.price * l.qty}</span>
                        </li>
                      ))}
                      {t.lines.length > 3 && (
                        <li className="text-xs italic text-slate-500">
                          +{t.lines.length - 3} more item{t.lines.length - 3 > 1 ? 's' : ''}
                        </li>
                      )}
                    </ul>

                    <button
                      onClick={() => onResume(t)}
                      className="mt-4 w-full rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-md shadow-orange-500/30 hover:shadow-lg transition-all"
                    >
                      Resume Ticket
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="border-t border-white/10 px-6 py-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Press Esc to close</span>
            <Clock />
          </div>
        </footer>
      </aside>
    </>
  );
}