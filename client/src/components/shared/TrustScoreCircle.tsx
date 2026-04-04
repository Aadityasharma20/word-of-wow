interface TrustScoreCircleProps {
  score: number;
  size?: number;
}

export function TrustScoreCircle({ score, size = 120 }: TrustScoreCircleProps) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const color = score >= 70 ? 'var(--color-success)' : score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--color-surface-2)" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 700, color }}>{score.toFixed(1)}</span>
        <span style={{ fontSize: size * 0.1, color: 'var(--color-text-secondary)' }}>Trust</span>
      </div>
    </div>
  );
}
