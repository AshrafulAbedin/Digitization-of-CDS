import { useMemo, useRef, useState } from 'react';
import type { Product } from '../../types';
import { fmtTaka } from '../../types';
import { SearchInput } from '../../components/ui/SearchInput';
import { Segmented } from '../../components/ui/Segmented';
import { Stepper } from '../../components/ui/Stepper';
import { Button } from '../../components/ui/Button';

type Filter = 'all' | 'kitchen' | 'ready';

export function productAvailable(p: Product): boolean {
  if (p.type === 'PREPARED') return p.status === 'Available';
  return (p.stock ?? 0) > 0;
}

function edgeColor(p: Product): string {
  if (p.type === 'PREPARED') {
    if (p.status === 'Available') return 'bg-kitchen';
    if (p.status === 'Preparing') return 'bg-gold';
    return 'bg-warn';
  }
  return (p.stock ?? 0) > 0 ? 'bg-kitchen' : 'bg-warn';
}

function availabilityLabel(p: Product) {
  if (p.type === 'PREPARED') {
    if (p.status === 'Available') return <span className="text-sm text-kitchen">Batch #{p.batch_id}</span>;
    if (p.status === 'Preparing') return <span className="text-sm text-[#8a6a3a]">Cooking…</span>;
    return <span className="text-sm text-warn">Sold out</span>;
  }
  const stock = p.stock ?? 0;
  if (stock <= 0) return <span className="text-sm text-warn">Out of stock</span>;
  const low = p.reorder_level != null && stock <= p.reorder_level;
  return (
    <span className="tabular text-sm text-label">
      {stock} left{' '}
      {low && <span className="rounded-full bg-[#f4e9d8] px-1.5 text-[#8a6a3a]">Low</span>}
    </span>
  );
}

interface CatalogProps {
  products: Product[];
  onAdd: (p: Product) => void;
  onStockout: (p: Product, qty: number) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
}

export function Catalog({ products, onAdd, onStockout, searchRef }: CatalogProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [stockoutFor, setStockoutFor] = useState<Product | null>(null);
  const [stockoutQty, setStockoutQty] = useState(1);
  const pressedRef = useRef<number | null>(null);
  const [pressed, setPressed] = useState<number | null>(null);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        if (filter === 'kitchen' && p.type !== 'PREPARED') return false;
        if (filter === 'ready' && p.type !== 'READY_MADE') return false;
        return p.name.toLowerCase().includes(query.toLowerCase());
      }),
    [products, query, filter],
  );

  const handleClick = (p: Product) => {
    setPressed(p.id);
    clearTimeout(pressedRef.current ?? undefined);
    pressedRef.current = window.setTimeout(() => setPressed(null), 100);
    if (productAvailable(p)) {
      onAdd(p);
    } else {
      setStockoutFor(p);
      setStockoutQty(1);
    }
  };

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#e7e2da] bg-paper px-4 py-3">
        <SearchInput
          ref={searchRef}
          placeholder="Search items…  ( / )"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs flex-1"
        />
        <Segmented<Filter>
          options={[
            { value: 'all', label: 'All' },
            { value: 'kitchen', label: 'Kitchen' },
            { value: 'ready', label: 'Ready-Made' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>

      <div className="grid flex-1 auto-rows-min grid-cols-3 gap-3 overflow-y-auto p-4 xl:grid-cols-4 2xl:grid-cols-5">
        {filtered.map((p) => {
          const available = productAvailable(p);
          return (
            <div key={p.id} className="relative">
              <button
                onClick={() => handleClick(p)}
                className={`relative flex h-[110px] w-full flex-col justify-between overflow-hidden rounded-xl border border-[#e7e2da] bg-white p-3 pl-4 text-left transition-transform duration-100 hover:border-[#c9c2b6] ${
                  pressed === p.id ? 'scale-[0.97]' : ''
                } ${available ? '' : 'opacity-50'}`}
              >
                <span className={`absolute inset-y-0 left-0 w-1 ${edgeColor(p)}`} aria-hidden />
                <span className="line-clamp-2 font-medium text-body">{p.name}</span>
                <span className="flex items-end justify-between">
                  <span className="tabular font-bold text-ink">{fmtTaka(p.price)}</span>
                  {availabilityLabel(p)}
                </span>
              </button>

              {stockoutFor?.id === p.id && (
                <div className="absolute top-full left-0 z-20 mt-1 w-56 rounded-xl border border-[#e7e2da] bg-white p-3 shadow-lg">
                  <div className="text-sm font-medium text-ink">Log missed demand</div>
                  <div className="mt-1 text-sm text-label">Customer wanted {p.name}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <Stepper value={stockoutQty} min={1} max={20} onChange={setStockoutQty} small />
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setStockoutFor(null)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          onStockout(p, stockoutQty);
                          setStockoutFor(null);
                        }}
                      >
                        Log
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-10 text-center text-label">No items match “{query}”</div>
        )}
      </div>
    </section>
  );
}
