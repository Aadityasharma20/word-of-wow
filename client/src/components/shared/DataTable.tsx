import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  onSort?: (key: string, order: 'asc' | 'desc') => void;
}

export function DataTable<T extends Record<string, unknown>>({
  columns, data, total, page = 1, limit = 20,
  onPageChange, onRowClick, loading, emptyMessage = 'No data found',
  onSort,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const totalPages = total ? Math.ceil(total / limit) : 1;

  const handleSort = (key: string) => {
    const newOrder = sortKey === key && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortOrder(newOrder);
    onSort?.(key, newOrder);
  };

  if (loading) {
    return (
      <div className="glass" style={{ padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{
            height: 48, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)',
            marginBottom: '0.5rem', animation: 'shimmer 1.5s infinite',
            backgroundImage: 'linear-gradient(90deg, var(--color-surface-2) 25%, var(--color-surface-3) 50%, var(--color-surface-2) 75%)',
            backgroundSize: '200% 100%',
          }} />
        ))}
      </div>
    );
  }

  return (
    <div className="glass" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} onClick={() => col.sortable && handleSort(col.key)} style={{
                  padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem',
                  fontWeight: 600, color: 'var(--color-text-secondary)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  borderBottom: '1px solid var(--color-border)',
                  cursor: col.sortable ? 'pointer' : 'default',
                  userSelect: 'none', width: col.width,
                  whiteSpace: 'nowrap',
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{
                  padding: '3rem 1rem', textAlign: 'center',
                  color: 'var(--color-text-muted)', fontSize: '0.9rem',
                }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, i) => (
                <tr key={i} onClick={() => onRowClick?.(item)} style={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background var(--transition-fast)',
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {columns.map((col) => (
                    <td key={col.key} style={{
                      padding: '0.7rem 1rem', fontSize: '0.85rem',
                      borderBottom: '1px solid var(--color-border)',
                      color: 'var(--color-text)',
                    }}>
                      {col.render ? col.render(item) : String(item[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total !== undefined && totalPages > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)',
          fontSize: '0.8rem', color: 'var(--color-text-secondary)',
        }}>
          <span>Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}</span>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ padding: '0.4rem 0.8rem' }}>Page {page} of {totalPages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
