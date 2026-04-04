import React from 'react';
import { Card } from './Card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: number;
  icon?: React.ReactNode;
  accentColor?: string;
  subtitle?: string;
}

export function StatCard({ label, value, trend, icon, accentColor, subtitle }: StatCardProps) {
  const trendColor = trend && trend > 0 ? 'var(--color-success)' : trend && trend < 0 ? 'var(--color-danger)' : 'var(--color-text-muted)';
  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;

  return (
    <Card style={{ position: 'relative', overflow: 'hidden' }}>
      {accentColor && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: accentColor,
        }} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.35rem', fontWeight: 500 }}>{label}</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}>{value}</p>
          {trend !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.35rem' }}>
              <TrendIcon size={14} color={trendColor} />
              <span style={{ fontSize: '0.75rem', color: trendColor, fontWeight: 600 }}>
                {trend > 0 ? '+' : ''}{trend}
              </span>
            </div>
          )}
          {subtitle && (
            <p style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', marginTop: '0.3rem', lineHeight: 1.35, opacity: 0.65 }}>
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div style={{
            width: 40, height: 40, borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface-2)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: accentColor || 'var(--color-primary)',
          }}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
