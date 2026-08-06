import type { Customer, Product } from '../../types';

export interface TicketLine {
  product: Product;
  qty: number;
  /** Escalation in flight: id of the kitchen_request being polled. */
  pendingRequestId?: number;
  /** Kitchen-approved ceiling once an escalation resolved. */
  approvedCeiling?: number;
  /** Brief visual feedback after an escalation resolves. */
  flash?: 'ok' | 'reject';
}

export interface ParkedTicket {
  id: number;
  lines: TicketLine[];
  customer: Customer | null;
  dineTakeaway: 'dine_in' | 'takeaway';
  parkedAt: number;
}
