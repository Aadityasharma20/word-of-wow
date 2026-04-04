interface LoadingSkeletonProps {
  lines?: number;
  height?: number;
  style?: React.CSSProperties;
}

export function LoadingSkeleton({ lines = 3, height = 16, style }: LoadingSkeletonProps) {
  return (
    <div style={style}>
      {[...Array(lines)].map((_, i) => (
        <div key={i} style={{
          height,
          width: i === lines - 1 ? '60%' : '100%',
          background: 'linear-gradient(90deg, var(--color-surface-2) 25%, var(--color-surface-3) 50%, var(--color-surface-2) 75%)',
          backgroundSize: '200% 100%',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '0.5rem',
          animation: 'shimmer 1.5s infinite',
        }} />
      ))}
    </div>
  );
}
