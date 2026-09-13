import type { RefObject } from 'react';
import type { Product } from '../../types';
import { SearchInput } from '../../components/ui/SearchInput';
import { EmptyState } from '../../components/ui/EmptyState';

export function productAvailable(p: Product) {
  return p.status === 'Available' || (p.status.startsWith('Live Stock:') && p.stock !== null && p.stock > 0);
}

interface CatalogProps {
  products: Product[];
  onAdd: (p: Product) => void;
  onStockout: (p: Product, qty: number) => void;
  searchRef: RefObject<HTMLInputElement | null>;
}

export function Catalog({ products, onAdd, onStockout, searchRef }: CatalogProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6 flex items-center gap-3">
        <SearchInput ref={searchRef} placeholder="Search food… (Press / to focus)" className="flex-1 max-w-md" />
      </div>

      {products.length === 0 ? (
        <EmptyState title="No items found" hint="Try a different search term." />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => {
            const available = productAvailable(p);
            const low = p.stock !== null && p.stock <= 5 && available;

            return (
              <button
                key={p.id}
                onClick={() => available && onAdd(p)}
                disabled={!available}
                className={`group relative flex min-h-[140px] flex-col items-start justify-between overflow-hidden rounded-2xl border-2 p-5 text-left transition-all ${
                  available
                    ? 'border-hairline bg-white hover:-translate-y-1 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20'
                    : 'cursor-not-allowed border-hairline bg-white/60 opacity-60'
                }`}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <h3 className="font-display text-2xl font-extrabold leading-tight text-ink">
                    {p.name}
                  </h3>
                  {!available && (
                    <span className="shrink-0 rounded-full bg-rose-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-rose-700">
                      Out
                    </span>
                  )}
                  {low && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-800">
                      Low
                    </span>
                  )}
                </div>

                <p className="mt-4 font-mono text-3xl font-extrabold text-orange-600">
                  <span className="text-lg text-label">৳</span>
                  {p.price}
                </p>

                {!available && (
                  <div
                    className="absolute inset-0 z-10 flex items-center justify-center bg-white/85 backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Log missed demand for ${p.name}?`)) onStockout(p, 1);
                    }}
                  >
                    <span className="rounded-full bg-orange-500 px-4 py-2 text-sm font-extrabold text-white shadow-lg">
                      Log missed demand
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
// function getFoodEmoji(name: string, type: string) {
//   const lower = name.toLowerCase();
//   if (lower.includes('rice')) return '';
//   if (lower.includes('chicken')) return '';
//   if (lower.includes('coke') || lower.includes('water') || lower.includes('drink')) return '';
//   if (lower.includes('chips') || lower.includes('fries')) return '';
//   if (lower.includes('samosa') || lower.includes('shingara')) return '';
//   if (lower.includes('puri')) return '';
//   if (lower.includes('egg')) return '';
//   return type === 'PREPARED' ? '🍽️' : '📦';
// }

// interface CatalogProps {
//   products: Product[];
//   onAdd: (p: Product) => void;
//   onStockout: (p: Product, qty: number) => void;
//   searchRef: RefObject<HTMLInputElement | null>;
// }

// export function Catalog({ products, onAdd, onStockout, searchRef }: CatalogProps) {
//   return (
//     <div className="flex-1 overflow-y-auto p-6">
//       <div className="mb-6 flex items-center gap-3">
//         <SearchInput ref={searchRef} placeholder="Search food… (Press / to focus)" className="flex-1 max-w-md" />
//       </div>

//       {products.length === 0 ? (
//         <EmptyState title="No items found" hint="Try a different search term." />
//       ) : (
//         <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
//           {products.map((p) => {
//             const available = productAvailable(p);
//             const low = p.stock !== null && p.stock <= 5 && available;

//             return (
//               <button
//                 key={p.id}
//                 onClick={() => available && onAdd(p)}
//                 disabled={!available}
//                 className={`group relative flex min-h-[140px] flex-col items-start justify-between overflow-hidden rounded-2xl border-2 p-5 text-left transition-all ${
//                   available
//                     ? 'border-hairline bg-white hover:-translate-y-1 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20'
//                     : 'cursor-not-allowed border-hairline bg-white/60 opacity-60'
//                 }`}
//               >
//                 <div className="mb-3 flex w-full items-start justify-between">
//                   <span className="text-4xl">{getFoodEmoji(p.name, p.type)}</span>
//                   {!available && (
//                     <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-rose-700">Out</span>
//                   )}
//                   {low && (
//                     <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-800">Low</span>
//                   )}
//                 </div>
//                 <h3 className="font-display font-extrabold text-ink leading-tight mb-2 text-lg">{p.name}</h3>
//                 <p className="mt-auto font-mono font-extrabold text-orange-600 text-2xl">
//                   <span className="text-base text-label">৳</span>{p.price}
//                 </p>

//                 {!available && (
//                   <div
//                     className="absolute inset-0 z-10 flex items-center justify-center bg-white/85 backdrop-blur-sm"
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       if (confirm(`Log missed demand for ${p.name}?`)) onStockout(p, 1);
//                     }}
//                   >
//                     <span className="rounded-full bg-orange-500 px-3 py-1.5 text-sm font-bold text-white shadow-lg">Log missed demand</span>
//                   </div>
//                 )}
//               </button>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }