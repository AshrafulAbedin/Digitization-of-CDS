import { useMemo, useState } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  emptyMessage?: string;
}

export function DataTable<T>({ columns, rows, rowKey, emptyMessage = 'No data' }: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir;
    });
  }, [rows, sort, columns]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-lg">
        <thead>
          <tr className="border-b-2 border-hairline bg-emerald-100/70 text-left">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-6 py-5 text-sm font-extrabold uppercase tracking-widest text-ink select-none ${
                  c.align === 'right' ? 'text-right' : ''
                } ${c.sortValue ? 'cursor-pointer hover:text-emerald-700 transition-colors' : ''}`}
                onClick={() =>
                  c.sortValue && setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === 1 ? -1 : 1 }))
                }
              >
                {c.header}
                {sort?.key === c.key && <span className="ml-1.5 text-emerald-700">{sort.dir === 1 ? '↑' : '↓'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-16 text-center">
                <div className="text-4xl opacity-40 mb-2">📭</div>
                <div className="text-lg font-bold text-body">{emptyMessage}</div>
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr key={rowKey(row)} className="border-b border-hairline last:border-0 hover:bg-emerald-100/40 transition-colors">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-6 py-5 text-lg text-ink font-medium ${
                      c.align === 'right' ? 'text-right font-mono tabular-nums' : ''
                    }`}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}