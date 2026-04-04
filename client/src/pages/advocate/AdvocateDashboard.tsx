import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { StatCard } from '../../components/shared/StatCard';
import { TrustScoreCircle } from '../../components/shared/TrustScoreCircle';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Card } from '../../components/shared/Card';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import { FileText, CheckCircle, Clock, Gift } from 'lucide-react';

export default function AdvocateDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, subsRes] = await Promise.all([
          api.get('/submissions/my-profile'),
          api.get('/submissions?limit=5&sort=created_at&order=desc'),
        ]);
        setProfile(profileRes.data.data);
        setSubmissions(subsRes.data.data || []);
      } catch {
        // Will show defaults
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingSkeleton lines={8} height={24} />;

  const trustScore = profile?.trust_score ?? 50;
  const totalSubs = profile?.total_submissions ?? 0;
  const approvedSubs = profile?.approved_submissions ?? 0;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back! Here's your advocacy overview.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
        {/* Trust Score */}
        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 2rem' }}>
          <TrustScoreCircle score={trustScore} size={140} />
          <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Your Trust Score</p>
        </Card>

        {/* Stats */}
        <div className="stats-grid">
          <StatCard label="Total Submissions" value={totalSubs} icon={<FileText size={20} />} accentColor="var(--color-primary)" />
          <StatCard label="Approved" value={approvedSubs} icon={<CheckCircle size={20} />} accentColor="var(--color-success)" />
          <StatCard label="Pending" value={Math.max(0, totalSubs - approvedSubs)} icon={<Clock size={20} />} accentColor="var(--color-secondary)" />
          <StatCard label="Coupons Earned" value={approvedSubs} icon={<Gift size={20} />} accentColor="var(--color-primary-light)" />
        </div>
      </div>

      {/* Recent Submissions */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Submissions</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/advocate/submissions')}>View All</button>
        </div>
        {submissions.length === 0 ? (
          <EmptyState message="No submissions yet — browse campaigns to get started!" action={{ label: 'Browse Campaigns', onClick: () => navigate('/advocate/campaigns') }} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Campaign', 'Platform', 'Date', 'Score', 'Status'].map((h) => (
                  <th key={h} style={{
                    padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.7rem',
                    color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
                    borderBottom: '1px solid var(--color-border)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub: any) => (
                <tr key={sub.id} onClick={() => navigate(`/advocate/submissions/${sub.id}`)}
                  style={{ cursor: 'pointer', transition: 'background var(--transition-fast)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}>{sub.campaign_title || '—'}</td>
                  <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem', textTransform: 'capitalize' }}>{sub.platform}</td>
                  <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{new Date(sub.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>{sub.score_final ? Math.round(sub.score_final) : '—'}</td>
                  <td style={{ padding: '0.6rem 0.75rem' }}><StatusBadge status={sub.review_status || sub.scoring_status || 'pending'} size="sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-xl)' }}>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/advocate/campaigns')}>Browse Campaigns</button>
        <button className="btn btn-secondary btn-lg" onClick={() => navigate('/advocate/rewards')}>View Rewards</button>
      </div>
    </div>
  );
}
