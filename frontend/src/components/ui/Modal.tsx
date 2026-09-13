import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  wide?: boolean;
}

export function Modal({ open, onClose, title, children, wide }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full ${
          wide ? 'max-w-2xl' : 'max-w-md'
        } rounded-3xl border border-white/10 bg-[#131a2e] p-7 shadow-2xl shadow-black/50`}
      >
        {title && (
          <h2 className="mb-5 font-display text-xl font-bold text-white">{title}</h2>
        )}
        <div className="text-slate-300">{children}</div>
      </div>
    </div>
  );
}