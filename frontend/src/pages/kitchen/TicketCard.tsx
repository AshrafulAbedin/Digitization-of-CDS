import type { BoardOrder, OrderStatus } from '../../types';

interface TicketCardProps {
  order: BoardOrder;
  onAdvance: (id: number, status: OrderStatus) => void;
}

export function TicketCard({ order, onAdvance }: TicketCardProps) {
  const themes: Record<string, { border: string; bg: string; headerBg: string; btn: string; label: string; nextStatus: OrderStatus; nextLabel: string }> = {
    paid: {
      border: 'border-emerald-400',
      bg: 'bg-emerald-50',
      headerBg: 'bg-gradient-to-r from-emerald-500 to-teal-600',
      btn: 'from-emerald-500 to-teal-600',
      label: 'NEW', nextStatus: 'preparing', nextLabel: 'Start Cooking',
    },
    preparing: {
      border: 'border-orange-400',
      bg: 'bg-orange-50',
      headerBg: 'bg-gradient-to-r from-orange-500 to-amber-600',
      btn: 'from-orange-500 to-amber-600',
      label: 'COOKING', nextStatus: 'ready', nextLabel: 'Mark Ready',
    },
    ready: {
      border: 'border-emerald-500',
      bg: 'bg-emerald-50',
      headerBg: 'bg-gradient-to-r from-emerald-600 to-green-700',
      btn: 'from-emerald-600 to-green-700',
      label: 'READY', nextStatus: 'served', nextLabel: 'Mark Served',
    },
  };

  const t = themes[order.status] ?? themes.paid;
  const minutesAgo = Math.floor((Date.now() - new Date(order.order_timestamp).getTime()) / 60000);

  return (
    <div className={`flex w-[320px] flex-col overflow-hidden rounded-3xl border-2 ${t.border} ${t.bg} shadow-lg transition-all hover:shadow-xl hover:-translate-y-1`}>
      <div className={`flex items-center justify-between px-5 py-4 ${t.headerBg} text-white`}>
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-3xl font-extrabold">#{order.order_id}</span>
          <span className="rounded-full bg-white/30 px-3 py-1 text-xs font-extrabold uppercase tracking-widest">{t.label}</span>
        </div>
        <div className="text-right">
          <div className="text-xs font-extrabold uppercase tracking-wider opacity-95">
            {order.dine_in_takeaway === 'dine_in' ? '🍽️ Dine In' : '🥡 Takeaway'}
          </div>
          <div className="font-mono text-base font-extrabold mt-0.5">{minutesAgo}m</div>
        </div>
      </div>

      <div className="border-b-2 border-hairline bg-white/90 px-5 py-3">
        <span className="text-base font-extrabold text-ink">👤 {order.customer_name}</span>
      </div>

      <div className="flex-1 space-y-3 p-5">
        {order.items?.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3">
            <span className="font-display text-lg font-extrabold text-ink leading-tight">{item.name}</span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 border-2 border-emerald-200 font-mono text-lg font-extrabold text-emerald-900">{item.qty}</span>
          </div>
        ))}
        {(!order.items || order.items.length === 0) && <p className="text-base font-bold text-body italic">No kitchen items</p>}
      </div>

      <div className="p-4 pt-0">
        <button
          onClick={() => onAdvance(order.order_id, t.nextStatus)}
          className={`w-full rounded-2xl bg-gradient-to-r ${t.btn} py-3.5 text-base font-extrabold text-white shadow-md transition-all active:scale-[0.97] hover:shadow-lg`}
        >
          {t.nextLabel} →
        </button>
      </div>
    </div>
  );
}