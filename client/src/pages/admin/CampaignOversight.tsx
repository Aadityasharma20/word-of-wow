import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { DataTable } from '../../components/shared/DataTable';
import { StatusBadge } from '../../components/shared/StatusBadge';

export default function CampaignOversight() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await api.get('/admin/campaigns');
        setCampaigns(res.data.data || []);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    fetchCampaigns();
  }, []);

  const handlePause = async (id: string) => {
    try {
      await api.patch(`/admin/campaigns/${id}`, { status: 'paused' });
      setCampaigns(campaigns.map((c: any) => c.id === id ? { ...c, status: 'paused' } : c));
    } catch { /* empty */ }
  };

  const columns = [
    { key: 'brand_name', label: 'Brand', render: (item: any) => item.brand_name || '—' },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'status', label: 'Status', render: (item: any) => <StatusBadge status={item.status} size="sm" /> },
    { key: 'submission_count', label: 'Submissions', sortable: true, render: (item: any) => item.submission_count || 0 },
    { key: 'avg_score', label: 'Avg Score', sortable: true, render: (item: any) => item.avg_score ? Math.round(item.avg_score) : '—' },
    { key: 'created_at', label: 'Created', sortable: true, render: (item: any) => new Date(item.created_at).toLocaleDateString() },
    { key: 'actions', label: '', width: '100px', render: (item: any) => item.status === 'active' ? (
      <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handlePause(item.id); }}>Pause</button>
    ) : null },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Campaign Oversight</h1>
        <p>Monitor and manage all campaigns across brands.</p>
      </div>

      <DataTable columns={columns} data={campaigns} loading={loading}
        emptyMessage="No campaigns on the platform yet." />
    </div>
  );
}
