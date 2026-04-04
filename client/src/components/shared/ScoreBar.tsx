interface ScoreBarProps {
  label: string;
  score: number;
  maxScore?: number;
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'var(--color-success)';
  if (score >= 40) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

export function ScoreBar({ label, score, maxScore = 100 }: ScoreBarProps) {
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100));
  const color = getScoreColor(score);

  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{label}</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color }}>{Math.round(score)}</span>
      </div>
      <div style={{
        height: 6, borderRadius: 'var(--radius-full)',
        background: 'var(--color-surface-2)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 'var(--radius-full)',
          background: color, transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}
