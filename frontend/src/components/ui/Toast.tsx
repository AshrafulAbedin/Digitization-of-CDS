import { createContext, useCallback, useContext, useRef, useState } from 'react';

interface ToastMsg {
  id: number;
  text: string;
  tone: 'ok' | 'error';
}

const ToastContext = createContext<(text: string, tone?: 'ok' | 'error') => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const nextId = useRef(1);

  const push = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((m) => m.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-ticket-in rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-2xl backdrop-blur-xl ${
              t.tone === 'error'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 shadow-rose-500/30'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/30'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}