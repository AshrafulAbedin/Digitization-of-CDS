import { useEffect, useRef, useState } from 'react';
import { apiGet } from '../../api/client';
import type { BoardOrder } from '../../types';
import { usePolling } from '../../hooks/usePolling';
import { Clock } from '../../components/Clock';

const TICKER_ITEMS = [
  () => '🍽️ Welcome to OvenFresh — grab a seat, we will call your number!',
  () => '💵 Pay by cash or mobile banking at the counter',
  () => '⭐ Today\'s special — ask at the counter',
  () => '📢 Listen for your token number and collect at the counter',
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
      const t = setTimeout(() => setFlash(false), 2000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyIds, board == null]);

  useEffect(() => {
    const id = setInterval(() => setTickerIdx((i) => (i + 1) % TICKER_ITEMS.length), 8000);
    return () => clearInterval(id);
  }, []);

  const shownReady = ready.slice(-9);
  const shownPreparing = preparing.slice(0, 8);
  const shownQueued = queued.slice(0, 12);

  return (
    <div className="flex h-full flex-col bg-paper">
      <header className="flex h-20 items-center justify-between border-b border-hairline bg-white/80 backdrop-blur-xl px-8">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white p-2.5 rounded-2xl text-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center">🎟️</div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-ink leading-none">
              Oven<span className="text-emerald-600">Fresh</span> Tokens
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest text-body mt-1">Live Order Status</p>
          </div>
        </div>
        <Clock withDate />
      </header>

      <div className="flex min-h-0 flex-1">
        <section aria-live="polite" className={`relative flex w-[62%] flex-col border-r border-hairline p-8 transition-all duration-500 ${flash ? 'bg-orange-100/60' : ''}`}>
          <div className="relative z-10 flex items-center gap-3 mb-6">
            <span className="flex h-3 w-3 rounded-full bg-orange-500 animate-pulse shadow-[0_0_12px_rgba(255,122,26,0.6)]" />
            <h2 className="font-display text-3xl font-extrabold text-orange-600 uppercase tracking-wider">Now Serving</h2>
          </div>

          {shownReady.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center">
              <div className="text-7xl opacity-30 mb-4">🍽️</div>
              <p className="font-display text-2xl font-bold text-body">Waiting for the kitchen…</p>
              <p className="text-sm text-label mt-2 font-medium">Your food will appear here when it's ready</p>
            </div>
          ) : (
            <div className="relative z-10 grid flex-1 auto-rows-min grid-cols-2 content-start gap-5 xl:grid-cols-3">
              {shownReady.map((o) => (
                <div
                  key={o.order_id}
                  className={`flex items-center justify-center rounded-3xl border-4 py-6 shadow-lg transition-all ${
                    o.order_id === newestReady.current
                      ? 'animate-token-in border-orange-500 bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-orange-500/40'
                      : 'border-orange-300 bg-orange-50 text-orange-600'
                  }`}
                >
                  <span className="font-mono text-8xl font-extrabold tabular-nums leading-none">{o.order_id}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section aria-live="polite" className="flex w-[38%] flex-col gap-6 p-8">
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="font-display text-2xl font-extrabold text-amber-700 uppercase tracking-wider">Cooking</h2>
              {preparing.length > 0 && (
                <span className="ml-auto rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{preparing.length}</span>
              )}
            </div>
            <div className="space-y-2.5 overflow-y-auto pr-1">
              {shownPreparing.map((o) => (
                <div key={o.order_id} className="shimmer flex items-center gap-4 rounded-2xl border border-amber-200 bg-white px-5 py-3">
                  <div className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="font-mono text-4xl font-extrabold tabular-nums text-ink">{o.order_id}</span>
                </div>
              ))}
              {preparing.length > 8 && <div className="text-center text-sm font-bold text-body py-1">+{preparing.length - 8} more cooking</div>}
              {preparing.length === 0 && <p className="rounded-2xl border border-dashed border-hairline bg-white/60 py-6 text-center text-sm text-body font-medium">No orders cooking</p>}
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col border-t border-dashed border-hairline pt-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-3 w-3 rounded-full bg-emerald-500" />
              <h2 className="font-display text-2xl font-extrabold text-emerald-700 uppercase tracking-wider">In Queue</h2>
              {queued.length > 0 && (
                <span className="ml-auto rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">{queued.length}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2.5 overflow-y-auto content-start">
              {shownQueued.map((o) => (
                <span key={o.order_id} className="rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-2 font-mono text-3xl font-extrabold tabular-nums text-emerald-700">
                  {o.order_id}
                </span>
              ))}
              {queued.length > 12 && <span className="self-center text-sm font-bold text-body">+{queued.length - 12} more</span>}
              {queued.length === 0 && <p className="w-full rounded-2xl border border-dashed border-hairline bg-white/60 py-6 text-center text-sm text-body font-medium">No orders queued</p>}
            </div>
          </div>
        </section>
      </div>

      <footer className="flex h-14 items-center justify-center border-t border-hairline bg-gradient-to-r from-orange-500 via-pink-500 to-orange-500">
        <span key={tickerIdx} className="animate-ticket-in text-lg font-bold text-white tracking-wide">{TICKER_ITEMS[tickerIdx]()}</span>
      </footer>
    </div>
  );
}