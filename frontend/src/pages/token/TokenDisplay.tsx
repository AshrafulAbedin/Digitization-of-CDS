import { useEffect, useRef, useState } from 'react';
import { apiGet } from '../../api/client';
import type { BoardOrder } from '../../types';
import { usePolling } from '../../hooks/usePolling';

const TICKER_ITEMS = [
  () =>
    new Date().toLocaleString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }),
  () => 'Pay by cash or mobile banking',
  () => "Today's special — ask at the counter",
];

export function TokenDisplay() {
  const { data: board } = usePolling<BoardOrder[]>(() => apiGet('/orders/board'), 2000);
  const [tickerIdx, setTickerIdx] = useState(0);
  const [flash, setFlash] = useState(false);
  const prevReady = useRef<Set<number>>(new Set());
  const newestReady = useRef<number | null>(null);
  const loadedOnce = useRef(false);

  const ready = (board ?? []).filter((o) => o.status === 'ready');
  const preparing = (board ?? []).filter((o) => o.status === 'preparing');
  const queued = (board ?? []).filter((o) => o.status === 'paid');

  // Flash the left zone once when a token becomes ready.
  const readyIds = ready.map((o) => o.order_id).join(',');
  useEffect(() => {
    if (board == null) return;
    const current = new Set(ready.map((o) => o.order_id));
    const fresh = [...current].filter((id) => !prevReady.current.has(id));
    const skipFlash = !loadedOnce.current;
    loadedOnce.current = true;
    prevReady.current = current;
    if (fresh.length > 0 && !skipFlash) {
      newestReady.current = Math.max(...fresh);
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyIds, board == null]);

  useEffect(() => {
    const id = setInterval(() => setTickerIdx((i) => (i + 1) % TICKER_ITEMS.length), 8000);
    return () => clearInterval(id);
  }, []);

  const shownReady = ready.slice(-8);
  const shownPreparing = preparing.slice(0, 10);
  const shownQueued = queued.slice(0, 10);

  return (
    <div className="flex h-full flex-col bg-paper">
      <div className="flex min-h-0 flex-1">
        <section
          aria-live="polite"
          className={`flex w-[60%] flex-col border-r-4 border-[#e0dad0] p-8 transition-shadow duration-300 ${
            flash ? 'shadow-[inset_0_0_0_6px_#2E7D32]' : ''
          }`}
        >
          <h1 className="flex items-center gap-3 text-3xl font-bold text-kitchen">
            <span aria-hidden>🔔</span> NOW SERVING
          </h1>
          {shownReady.length === 0 ? (
            <p className="mt-16 text-center text-2xl text-label">Waiting for the kitchen…</p>
          ) : (
            <div className="mt-6 grid flex-1 auto-rows-min grid-cols-2 content-start gap-6 xl:grid-cols-3">
              {shownReady.map((o) => (
                <div
                  key={o.order_id}
                  className={`flex items-center justify-center rounded-2xl border-2 border-kitchen bg-kitchen/10 py-8 ${
                    o.order_id === newestReady.current ? 'animate-token-in' : ''
                  }`}
                >
                  <span className="tabular font-mono text-8xl font-bold text-ink">
                    {o.order_id}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section aria-live="polite" className="flex w-[40%] flex-col gap-8 p-8">
          <div>
            <h2 className="text-2xl font-bold text-[#8a6a3a]">PREPARING</h2>
            <div className="mt-4 space-y-3">
              {shownPreparing.map((o) => (
                <div
                  key={o.order_id}
                  className="shimmer flex items-center rounded-xl border border-gold/50 bg-white px-5 py-3"
                >
                  <span className="tabular font-mono text-4xl font-bold text-ink">{o.order_id}</span>
                </div>
              ))}
              {preparing.length > 10 && (
                <div className="text-lg text-label">+{preparing.length - 10} more</div>
              )}
              {preparing.length === 0 && <p className="text-label">—</p>}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-[#3d5a8a]">IN QUEUE</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {shownQueued.map((o) => (
                <span
                  key={o.order_id}
                  className="tabular rounded-lg border border-[#c9d4e5] bg-white px-4 py-2 font-mono text-3xl font-semibold text-[#3d5a8a]"
                >
                  {o.order_id}
                </span>
              ))}
              {queued.length > 10 && <span className="self-center text-lg text-label">+{queued.length - 10} more</span>}
              {queued.length === 0 && <p className="text-label">—</p>}
            </div>
          </div>
        </section>
      </div>

      <footer className="flex h-12 items-center justify-center border-t border-[#e7e2da] bg-white">
        <span key={tickerIdx} className="animate-ticket-in text-base text-label">
          {TICKER_ITEMS[tickerIdx]()}
        </span>
      </footer>
    </div>
  );
}
