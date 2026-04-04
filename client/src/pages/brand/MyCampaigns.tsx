import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { DataTable } from '../../components/shared/DataTable';
import { StatusBadge } from '../../components/shared/StatusBadge';

export default function MyCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await api.get('/campaigns');
        setCampaigns(res.data.data || []);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    fetchCampaigns();
  }, []);

  const filtered = filter === 'all' ? campaigns : campaigns.filter((c: any) => c.status === filter);

  const columns = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'status', label: 'Status', render: (item: any) => <StatusBadge status={item.status} size="sm" /> },
    { key: 'platforms', label: 'Platforms', render: (item: any) => (item.platforms || []).join(', ') || 'reddit' },
    { key: 'submission_count', label: 'Submissions', sortable: true, render: (item: any) => item.submission_count || 0 },
    { key: 'avg_score', label: 'Avg Score', sortable: true, render: (item: any) => item.avg_score ? Math.round(item.avg_score) : '—' },
    { key: 'created_at', label: 'Created', sortable: true, render: (item: any) => new Date(item.created_at).toLocaleDateString() },
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>My Campaigns</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Manage your campaigns and track performance.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/brand/campaigns/new')}>+ Create Campaign</button>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
        {['all', 'active', 'draft', 'paused', 'completed'].map((s) => (
          <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(s)} style={{ textTransform: 'capitalize' }}>{s}</button>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} loading={loading}
        onRowClick={(item: any) => navigate(`/brand/campaigns/${item.id}`)}
        emptyMessage="No campaigns yet. Create your first one!" />
    </div>
  );
}
