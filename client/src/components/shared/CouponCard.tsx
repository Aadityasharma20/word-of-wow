import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Card } from './Card';

interface CouponCardProps {
  code: string;
  discountPercent: number;
  campaignName: string;
  expiresAt?: string | null;
}

export function CouponCard({ code, discountPercent, campaignName, expiresAt }: CouponCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card variant="highlighted" style={{
      background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.15), rgba(0, 210, 211, 0.1))',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary-light)' }}>
          {discountPercent}%
        </span>
        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginLeft: '0.25rem' }}>OFF</span>
      </div>

      <div
        onClick={handleCopy}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          padding: '0.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
          cursor: 'pointer', border: '1px dashed var(--color-border-light)',
          transition: 'all var(--transition-fast)',
        }}
      >
        <code style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '0.05em', color: 'var(--color-text)' }}>{code}</code>
        {copied ? <Check size={16} color="var(--color-success)" /> : <Copy size={16} color="var(--color-text-secondary)" />}
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.6rem', textAlign: 'center' }}>
        {campaignName}
      </p>
      {expiresAt && (
        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '0.25rem' }}>
          Expires: {new Date(expiresAt).toLocaleDateString()}
        </p>
      )}
    </Card>
  );
}
