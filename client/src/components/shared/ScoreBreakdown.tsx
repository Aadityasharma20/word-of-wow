import { ScoreBar } from './ScoreBar';
import { Card } from './Card';

interface ScoreBreakdownProps {
  contentQuality: number | null;
  brandRelevance: number | null;
  authenticity: number | null;
  engagement: number | null;
  audienceRelevance: number | null;
  finalScore: number | null;
}

export function ScoreBreakdown({ contentQuality, brandRelevance, authenticity, engagement, audienceRelevance, finalScore }: ScoreBreakdownProps) {
  const scoreColor = (finalScore ?? 0) >= 70 ? 'var(--color-success)' : (finalScore ?? 0) >= 40 ? 'var(--color-warning)' : 'var(--color-danger)';

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Score Breakdown</h3>
        <div style={{
          padding: '0.3rem 0.8rem', borderRadius: 'var(--radius-full)',
          background: scoreColor, color: '#fff', fontSize: '0.9rem', fontWeight: 700,
        }}>
          {finalScore !== null ? Math.round(finalScore) : '—'}/100
        </div>
      </div>
      <ScoreBar label="Content Quality" score={contentQuality ?? 0} />
      <ScoreBar label="Brand Relevance" score={brandRelevance ?? 0} />
      <ScoreBar label="Authenticity" score={authenticity ?? 0} />
      <ScoreBar label="Engagement" score={engagement ?? 0} />
      <ScoreBar label="Audience Relevance" score={audienceRelevance ?? 0} />
    </Card>
  );
}
