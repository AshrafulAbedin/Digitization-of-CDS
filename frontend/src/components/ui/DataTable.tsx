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
    <div className="overflow-x-auto rounded-xl border border-[#e7e2da] bg-white">
      <table className="w-full text-sm leading-[1.8]">
        <thead>
          <tr className="border-b border-[#e7e2da] text-left text-label">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-4 py-2.5 font-medium select-none ${c.align === 'right' ? 'text-right' : ''} ${c.sortValue ? 'cursor-pointer hover:text-body' : ''}`}
                onClick={() =>
                  c.sortValue &&
                  setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === 1 ? -1 : 1 }))
                }
              >
                {c.header}
                {sort?.key === c.key && (sort.dir === 1 ? ' ↑' : ' ↓')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-label">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr key={rowKey(row)} className="border-b border-[#f1ede7] last:border-0 hover:bg-paper/60">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-4 py-2 ${c.align === 'right' ? 'tabular text-right' : ''}`}
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
