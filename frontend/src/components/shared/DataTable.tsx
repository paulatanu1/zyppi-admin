import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
  searchValue?: string;
  pageSize?: number;
  actions?: React.ReactNode;
  emptyText?: string;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  data, columns, loading, searchPlaceholder, onSearch, searchValue = '',
  pageSize = 15, actions, emptyText = 'No data found', rowKey, onRowClick,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const total = data.length;
  const pageCount = Math.ceil(total / pageSize);
  const paginated = data.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
        {onSearch != null ? (
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder ?? 'Search...'}
              value={searchValue}
              onChange={e => { setPage(1); onSearch(e.target.value); }}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        ) : <div />}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              {columns.map(col => (
                <th key={col.key} className={cn('px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 w-full max-w-[120px] animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-sm text-gray-400">{emptyText}</td>
              </tr>
            ) : (
              paginated.map(row => (
                <tr key={rowKey(row)}
                  className={cn('hover:bg-gray-50/80 transition-colors', onRowClick && 'cursor-pointer')}
                  onClick={() => onRowClick?.(row)}>
                  {columns.map(col => (
                    <td key={col.key} className={cn('px-4 py-3 text-gray-700', col.className)}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-500">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, pageCount) }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                className={cn('rounded px-2.5 py-1 text-xs font-medium transition-colors', n === page ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100')}>
                {n}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
