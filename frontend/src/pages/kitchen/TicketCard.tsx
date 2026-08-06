import { useEffect, useState } from 'react';
import type { BoardOrder, OrderStatus } from '../../types';

const headerTone: Record<string, string> = {
  paid: 'bg-[#e8eef7] text-[#3d5a8a]',
  preparing: 'bg-[#f4e9d8] text-[#8a6a3a]',
  ready: 'bg-kitchen/15 text-kitchen',
};

const bumpLabel: Record<string, string> = {
  paid: 'Start',
  preparing: 'Ready',
  ready: 'Served',
};

const nextStatus: Record<string, OrderStatus> = {
  paid: 'preparing',
  preparing: 'ready',
  ready: 'served',
};

const prevStatus: Record<string, OrderStatus> = {
  preparing: 'paid',
  ready: 'preparing',
};

function useElapsed(sinceIso: string) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const secs = Math.max(0, Math.floor((Date.now() - new Date(sinceIso).getTime()) / 1000));
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return { text: `${mm}:${ss}`, mins: secs / 60 };
}

interface TicketCardProps {
  order: BoardOrder;
  onAdvance: (id: number, status: OrderStatus) => void;
}

export function TicketCard({ order, onAdvance }: TicketCardProps) {
  const { text, mins } = useElapsed(order.order_timestamp);
  const [menuOpen, setMenuOpen] = useState(false);
  const timerClass = mins >= 10 ? 'text-warn font-bold' : mins >= 5 ? 'text-[#8a6a3a] font-bold' : 'text-body';

  return (
    <div className="animate-ticket-in flex w-[260px] flex-col overflow-hidden rounded-xl border border-[#e7e2da] bg-white shadow-sm">
      <div className={`flex items-center justify-between px-3 py-2 ${headerTone[order.status]}`}>
        <span className="tabular font-mono text-5xl leading-none font-bold text-ink">
          #{order.order_id}
        </span>
        <span className={`tabular font-mono text-lg ${timerClass}`}>{text}</span>
      </div>
      <div className="flex items-center gap-1.5 border-b border-[#f1ede7] px-3 py-1.5 text-sm text-label">
        <span aria-hidden>{order.dine_in_takeaway === 'dine_in' ? '🍽' : '🥡'}</span>
        {order.dine_in_takeaway === 'dine_in' ? 'Dine-in' : 'Takeaway'} · {order.customer_name}
      </div>
      <ul className="flex-1 bg-paper px-3 py-2">
        {(order.items ?? []).map((it, i) => (
          <li key={i} className="flex items-center gap-2 py-1 text-lg text-body">
            <span className="tabular flex h-7 min-w-7 items-center justify-center rounded-md border border-[#d9d4cc] bg-white px-1 font-mono font-semibold">
              {it.qty}
            </span>
            {it.name}
          </li>
        ))}
      </ul>
      <div className="relative flex">
        <button
          className="h-[52px] flex-1 bg-ink text-lg font-bold text-white hover:bg-black"
          onClick={() => onAdvance(order.order_id, nextStatus[order.status])}
        >
          {bumpLabel[order.status]}
        </button>
        <button
          className="h-[52px] w-12 border-l border-white/20 bg-ink text-white hover:bg-black"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="More actions"
        >
          ⋯
        </button>
        {menuOpen && (
          <div className="absolute right-0 bottom-full z-20 mb-1 w-40 rounded-xl border border-[#e7e2da] bg-white py-1 shadow-lg">
            {prevStatus[order.status] && (
              <button
                className="block w-full px-3 py-2 text-left text-sm text-body hover:bg-paper"
                onClick={() => {
                  onAdvance(order.order_id, prevStatus[order.status]);
                  setMenuOpen(false);
                }}
              >
                Recall
              </button>
            )}
            <button
              className="block w-full px-3 py-2 text-left text-sm text-warn hover:bg-paper"
              onClick={() => {
                onAdvance(order.order_id, 'abandoned');
                setMenuOpen(false);
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
