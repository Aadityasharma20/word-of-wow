import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message: string;
  action?: { label: string; onClick: () => void };
  icon?: React.ReactNode;
}

export function EmptyState({ title, message, action, icon }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '3rem 1rem', textAlign: 'center',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 'var(--radius-lg)',
        background: 'var(--color-surface-2)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: '1rem', color: 'var(--color-text-muted)',
      }}>
        {icon || <Inbox size={28} />}
      </div>
      {title && <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.35rem' }}>{title}</h3>}
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', maxWidth: 400, marginBottom: action ? '1rem' : 0 }}>
        {message}
      </p>
      {action && (
        <button className="btn btn-primary" onClick={action.onClick}>{action.label}</button>
      )}
    </div>
  );
}
