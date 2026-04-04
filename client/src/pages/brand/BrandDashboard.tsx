import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { StatCard } from '../../components/shared/StatCard';
import { Card } from '../../components/shared/Card';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import { EmptyState } from '../../components/shared/EmptyState';
import { Megaphone, BarChart3, Users, TrendingUp, Eye } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const PIE_COLORS = ['#E17055', '#6C5CE7', '#E84393', '#00B894'];

export default function BrandDashboard() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [campRes, subsRes] = await Promise.all([
          api.get('/campaigns'),
          api.get('/submissions?limit=100'),
        ]);
        setCampaigns(campRes.data.data || []);
        setSubmissions(subsRes.data.data || []);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingSkeleton lines={8} height={24} />;

  const activeCampaigns = campaigns.filter((c: any) => c.status === 'active').length;
  const totalMentions = submissions.length;
  const avgScore = submissions.length > 0
    ? Math.round(submissions.reduce((sum: number, s: any) => sum + (s.score_final || 0), 0) / submissions.length)
    : 0;

  // Estimated eyeballs (inflated 1.5x to project organic impressions + second-degree visibility)
  const rawEyeballs = submissions.reduce((sum: number, s: any) => sum + (s.estimated_eyeballs || 0), 0);
  const totalEyeballs = Math.round(rawEyeballs * 1.5);
  const formatEyeballs = (n: number) => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);

  // Weekly mentions (simplified)
  const weeklyData = [...Array(8)].map((_, i) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - (7 - i) * 7);
    const weekEnd = new Date(weekAgo);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return {
      week: `W${i + 1}`,
      mentions: submissions.filter((s: any) => {
        const d = new Date(s.created_at);
        return d >= weekAgo && d < weekEnd;
      }).length,
    };
  });

  // Platform breakdown
  const redditCount = submissions.filter((s: any) => s.platform === 'reddit').length;
  const linkedinCount = submissions.filter((s: any) => s.platform === 'linkedin').length;
  const instagramCount = submissions.filter((s: any) => s.platform === 'instagram').length;
  const reviewCount = submissions.filter((s: any) => s.platform === 'review').length;
  const pieData = [
    { name: 'Reddit', value: redditCount || 0 },
    { name: 'LinkedIn', value: linkedinCount || 0 },
    { name: 'Instagram', value: instagramCount || 0 },
    { name: 'Reviews', value: reviewCount || 0 },
  ].filter(d => d.value > 0);
  if (pieData.length === 0) pieData.push({ name: 'No data', value: 1 });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Brand Dashboard</h1>
        <p>Monitor your campaigns and advocacy performance.</p>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <StatCard label="Total WOW Mentions Generated" value={totalMentions} icon={<Megaphone size={20} />}
          accentColor="var(--color-primary)" />
        <StatCard label="Active Campaigns" value={activeCampaigns} icon={<BarChart3 size={20} />}
          accentColor="var(--color-success)" />
        <StatCard label="Avg Score" value={avgScore} icon={<TrendingUp size={20} />}
          accentColor="var(--color-secondary)" />
        <StatCard label="Est. Eyeballs" value={formatEyeballs(totalEyeballs)} icon={<Eye size={20} />}
          accentColor="var(--color-warning)"
          subtitle="Projected reach including shares, views & impressions" />
      </div>

      {/* Charts */}
      <div className="content-grid" style={{ marginBottom: 'var(--space-xl)' }}>
        <Card>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>📈 Mentions Over Time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyData}>
              <XAxis dataKey="week" tick={{ fill: '#A0A0B0', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#A0A0B0', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
              <Line type="monotone" dataKey="mentions" stroke="#6C5CE7" strokeWidth={2} dot={{ fill: '#6C5CE7', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>📊 Platform Breakdown</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Campaigns */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Campaigns</h3>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/brand/campaigns/new')}>+ New Campaign</button>
        </div>
        {campaigns.length === 0 ? (
          <EmptyState message="Create your first campaign to start receiving authentic mentions!"
            action={{ label: 'Create Campaign', onClick: () => navigate('/brand/campaigns/new') }} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Title', 'Status', 'Submissions', 'Avg Score'].map((h) => (
                  <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.slice(0, 5).map((c: any) => (
                <tr key={c.id} onClick={() => navigate(`/brand/campaigns/${c.id}`)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}>{c.title}</td>
                  <td style={{ padding: '0.6rem 0.75rem' }}><StatusBadge status={c.status} size="sm" /></td>
                  <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}>{c.submission_count || 0}</td>
                  <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>{c.avg_score ? Math.round(c.avg_score) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
