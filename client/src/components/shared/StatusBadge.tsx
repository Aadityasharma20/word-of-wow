import React from 'react';

type StatusType = 'pending' | 'processing' | 'approved' | 'rejected' | 'flagged_for_review' | 'scored' | 'failed' | 'active' | 'paused' | 'completed' | 'draft' | 'none' | 'low' | 'medium' | 'high';

interface StatusBadgeProps {
  status: StatusType | string;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string; pulse?: boolean }> = {
  pending: { bg: 'rgba(160, 160, 176, 0.15)', color: '#A0A0B0', label: 'Pending' },
  processing: { bg: 'rgba(108, 92, 231, 0.15)', color: '#a29bfe', label: 'Processing', pulse: true },
  approved: { bg: 'rgba(0, 184, 148, 0.15)', color: '#00B894', label: 'Approved' },
  rejected: { bg: 'rgba(225, 112, 85, 0.15)', color: '#E17055', label: 'Rejected' },
  flagged_for_review: { bg: 'rgba(253, 203, 110, 0.15)', color: '#FDCB6E', label: 'Flagged' },
  scored: { bg: 'rgba(108, 92, 231, 0.15)', color: '#a29bfe', label: 'Scored' },
  failed: { bg: 'rgba(225, 112, 85, 0.15)', color: '#E17055', label: 'Failed' },
  active: { bg: 'rgba(0, 184, 148, 0.15)', color: '#00B894', label: 'Active' },
  paused: { bg: 'rgba(253, 203, 110, 0.15)', color: '#FDCB6E', label: 'Paused' },
  completed: { bg: 'rgba(160, 160, 176, 0.15)', color: '#A0A0B0', label: 'Completed' },
  draft: { bg: 'rgba(160, 160, 176, 0.15)', color: '#A0A0B0', label: 'Draft' },
  none: { bg: 'rgba(0, 184, 148, 0.15)', color: '#00B894', label: 'None' },
  low: { bg: 'rgba(253, 203, 110, 0.15)', color: '#FDCB6E', label: 'Low' },
  medium: { bg: 'rgba(225, 112, 85, 0.15)', color: '#E17055', label: 'Medium' },
  high: { bg: 'rgba(225, 112, 85, 0.2)', color: '#ff6348', label: 'High' },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { bg: 'rgba(160, 160, 176, 0.15)', color: '#A0A0B0', label: status };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: size === 'sm' ? '0.15rem 0.5rem' : '0.25rem 0.7rem',
        borderRadius: 'var(--radius-full)',
        background: config.bg,
        color: config.color,
        fontSize: size === 'sm' ? '0.7rem' : '0.75rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        animation: config.pulse ? 'pulse 2s ease-in-out infinite' : undefined,
      }}
    >
      <span style={{
        width: size === 'sm' ? 5 : 6,
        height: size === 'sm' ? 5 : 6,
        borderRadius: '50%',
        background: config.color,
      }} />
      {config.label}
    </span>
  );
}
