import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { StatCard } from '../../components/shared/StatCard';
import { Card } from '../../components/shared/Card';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import { Users, FileText, ClipboardCheck, Megaphone } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/stats');
        setStats(res.data.data || {});
      } catch {
        setStats({ totalUsers: 0, totalSubmissions: 0, pendingReviews: 0, activeCampaigns: 0 });
      } finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  if (loading) return <LoadingSkeleton lines={6} height={24} />;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Platform overview and quick actions.</p>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Users" value={stats?.totalUsers || 0}
          icon={<Users size={20} />} accentColor="var(--color-primary)" />
        <StatCard label="Total Submissions" value={stats?.totalSubmissions || 0}
          icon={<FileText size={20} />} accentColor="var(--color-secondary)" />
        <StatCard label="Pending Reviews" value={stats?.pendingReviews || 0}
          icon={<ClipboardCheck size={20} />} accentColor="var(--color-warning)" />
        <StatCard label="Active Campaigns" value={stats?.activeCampaigns || 0}
          icon={<Megaphone size={20} />} accentColor="var(--color-success)" />
      </div>

      <div className="content-grid">
        <Card onClick={() => navigate('/admin/review')} style={{ cursor: 'pointer' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>📋 Review Queue</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Review flagged submissions and take action.
          </p>
        </Card>
        <Card onClick={() => navigate('/admin/users')} style={{ cursor: 'pointer' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>👥 User Management</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Manage advocates and brands, suspend accounts.
          </p>
        </Card>
        <Card onClick={() => navigate('/admin/submissions')} style={{ cursor: 'pointer' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>📄 All Submissions</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            View and filter all submissions across campaigns.
          </p>
        </Card>
        <Card onClick={() => navigate('/admin/campaigns')} style={{ cursor: 'pointer' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>🛡️ Campaign Oversight</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Monitor and manage all campaigns.
          </p>
        </Card>
      </div>
    </div>
  );
}
