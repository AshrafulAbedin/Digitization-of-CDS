import { useState } from 'react';
import type { ActiveOrder, Customer } from '../../types';
import { apiGet, apiPost } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';

interface CustomerStripProps {
  customer: Customer | null;
  onCustomer: (c: Customer | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function CustomerStrip({ customer, onCustomer, inputRef }: CustomerStripProps) {
  const toast = useToast();
  const [value, setValue] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regIdType, setRegIdType] = useState<'student' | 'nid'>('student');
  const [regIdNumber, setRegIdNumber] = useState('');
  const [tokens, setTokens] = useState<ActiveOrder[] | null>(null);

  const lookup = async (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    const isPhone = /^01\d{9}$/.test(v);
    const path = isPhone
      ? `/customers/search?phone=${encodeURIComponent(v)}`
      : `/customers/search?idType=student&idNumber=${encodeURIComponent(v)}`;
    try {
      const rows = await apiGet<Customer[]>(path);
      if (rows.length > 0) {
        onCustomer(rows[0]);
        setNotFound(false);
        setValue('');
      } else {
        setNotFound(true);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Lookup failed', 'error');
    }
  };

  const register = async () => {
    try {
      const { customer_id } = await apiPost<{ customer_id: number }>('/customers/register', {
        name: regName,
        phone: /^01\d{9}$/.test(value.trim()) ? value.trim() : null,
        idType: regIdType,
        idNumber: regIdNumber || value.trim(),
      });
      onCustomer({
        customer_id,
        name: regName,
        phone: value.trim() || null,
        id_type: regIdType,
        id_number: regIdNumber || value.trim(),
        is_temporary: false,
      });
      setRegistering(false);
      setNotFound(false);
      setValue('');
      toast('Customer registered — verify physical ID');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Registration failed', 'error');
    }
  };

  if (customer) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-gold/60 bg-gold/10 px-3 py-2">
        <div className="min-w-0">
          <div className="truncate font-medium text-ink">{customer.name}</div>
          <div className="truncate text-sm text-label">
            {customer.id_type ? `${customer.id_type.toUpperCase()} ${customer.id_number}` : customer.phone}
            {' · '}
            <button
              className="text-[#8a6a3a] underline"
              onClick={async () => {
                try {
                  setTokens(await apiGet<ActiveOrder[]>(`/customers/${customer.customer_id}/active-orders`));
                } catch (e) {
                  toast(e instanceof Error ? e.message : 'Failed', 'error');
                }
              }}
            >
              View active tokens
            </button>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onCustomer(null)}>
          ✕
        </Button>

        <Modal open={tokens !== null} onClose={() => setTokens(null)} title="Active tokens">
          {tokens?.length === 0 && <p className="text-label">No active orders.</p>}
          <ul className="space-y-2">
            {tokens?.map((o) => (
              <li key={o.order_id} className="flex items-center justify-between rounded-lg border border-[#e7e2da] p-3">
                <span className="font-mono text-lg font-bold text-ink">#{o.order_id}</span>
                <span className="text-sm text-label">
                  {o.status} · {o.items?.map((i) => `${i.qty}× ${i.name}`).join(', ')}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-label">
            Reprinting a token does not clear the kitchen ticket — food is handed over by the kitchen.
          </p>
        </Modal>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setNotFound(false);
        }}
        onKeyDown={(e) => e.key === 'Enter' && lookup(value)}
        placeholder="Phone / Student ID (optional — Guest by default)"
        className="h-10 w-full rounded-lg border border-[#d9d4cc] bg-white px-3 text-sm outline-none placeholder:text-label focus:border-gold focus:ring-2 focus:ring-gold/30"
      />
      {notFound && !registering && (
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="text-label">No customer found.</span>
          <button className="font-medium text-[#8a6a3a] underline" onClick={() => setRegistering(true)}>
            Register
          </button>
        </div>
      )}
      {registering && (
        <div className="mt-2 space-y-2 rounded-lg border border-[#e7e2da] bg-white p-3">
          <input
            value={regName}
            onChange={(e) => setRegName(e.target.value)}
            placeholder="Full name"
            className="h-9 w-full rounded-lg border border-[#d9d4cc] px-3 text-sm outline-none focus:border-gold"
          />
          <div className="flex gap-2">
            <select
              value={regIdType}
              onChange={(e) => setRegIdType(e.target.value as 'student' | 'nid')}
              className="h-9 rounded-lg border border-[#d9d4cc] bg-white px-2 text-sm"
            >
              <option value="student">Student</option>
              <option value="nid">NID</option>
            </select>
            <input
              value={regIdNumber}
              onChange={(e) => setRegIdNumber(e.target.value)}
              placeholder="ID number"
              className="h-9 flex-1 rounded-lg border border-[#d9d4cc] px-3 text-sm outline-none focus:border-gold"
            />
          </div>
          <p className="text-xs text-label">Cashier must verify the physical ID.</p>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setRegistering(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" disabled={!regName || !(regIdNumber || value)} onClick={register}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
