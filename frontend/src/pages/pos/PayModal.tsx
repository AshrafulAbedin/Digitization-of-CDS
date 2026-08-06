import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { fmtTaka } from '../../types';
import type { TicketLine } from './posTypes';

interface PayModalProps {
  token: number | null;
  lines: TicketLine[];
  payment: 'cash' | 'mobile';
  onClose: () => void;
}

export function PayModal({ token, lines, payment, onClose }: PayModalProps) {
  const hasKitchen = lines.some((l) => l.product.type === 'PREPARED');
  const total = lines.reduce((s, l) => s + l.qty * l.product.price, 0);
  return (
    <Modal open={token !== null} onClose={onClose}>
      <div className="text-center">
        <div className="text-sm text-label">Token</div>
        <div className="tabular font-mono text-6xl font-bold text-ink">#{token}</div>
        <div className="mt-2 text-sm font-medium text-kitchen">
          {hasKitchen ? 'Sent to kitchen — watch the token screen' : 'Hand over items now'}
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-[#e7e2da] p-3 text-sm">
        {lines.map((l) => (
          <div key={l.product.id} className="flex justify-between py-0.5">
            <span className="text-body">
              {l.qty}× {l.product.name}
            </span>
            <span className="tabular text-body">{fmtTaka(l.qty * l.product.price)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-[#e7e2da] pt-2 font-semibold text-ink">
          <span>Total · {payment === 'cash' ? 'Cash' : 'Mobile banking'}</span>
          <span className="tabular">{fmtTaka(total)}</span>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="primary" className="flex-1" onClick={() => window.print()}>
          Print token
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}
