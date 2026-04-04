import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { DataTable } from '../../components/shared/DataTable';
import { StatusBadge } from '../../components/shared/StatusBadge';

export default function MySubmissions() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: '20', page: String(page), sort: 'created_at', order: 'desc' });
        if (statusFilter !== 'all') params.set('status', statusFilter);
        const res = await api.get(`/submissions?${params}`);
        setSubmissions(res.data.data || []);
        setTotal(res.data.total || 0);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    fetchSubmissions();
  }, [page, statusFilter]);

  const columns = [
    { key: 'campaign_title', label: 'Campaign', sortable: true, render: (item: any) => item.campaign_title || '—' },
    { key: 'platform', label: 'Platform', sortable: true, render: (item: any) => (
      <span style={{ textTransform: 'capitalize' as const }}>{item.platform}</span>
    )},
    { key: 'created_at', label: 'Date', sortable: true, render: (item: any) => new Date(item.created_at).toLocaleDateString() },
    { key: 'score_final', label: 'Score', sortable: true, render: (item: any) => (
      <span style={{ fontWeight: 600, color: (item.score_final || 0) >= 70 ? 'var(--color-success)' : (item.score_final || 0) >= 40 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
        {item.score_final ? Math.round(item.score_final) : '—'}
      </span>
    )},
    { key: 'status', label: 'Status', render: (item: any) => <StatusBadge status={item.review_status || item.scoring_status || 'pending'} size="sm" /> },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>My Submissions</h1>
        <p>Track all your campaign submissions and scores.</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        {['all', 'pending', 'approved', 'rejected', 'flagged_for_review'].map((s) => (
          <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            style={{ textTransform: 'capitalize' }}>
            {s === 'flagged_for_review' ? 'Flagged' : s}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={submissions}
        total={total}
        page={page}
        limit={20}
        onPageChange={setPage}
        onRowClick={(item: any) => navigate(`/advocate/submissions/${item.id}`)}
        loading={loading}
        emptyMessage="No submissions found. Browse campaigns to get started!"
      />
    </div>
  );
}
