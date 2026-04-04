import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { DataTable } from '../../components/shared/DataTable';
import { StatusBadge } from '../../components/shared/StatusBadge';

export default function AllSubmissions() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: '20', page: String(page), sort: 'created_at', order: 'desc' });
        if (statusFilter !== 'all') params.set('status', statusFilter);
        const res = await api.get(`/admin/submissions?${params}`);
        setSubmissions(res.data.data || []);
        setTotal(res.data.total || 0);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    fetchData();
  }, [page, statusFilter]);

  const columns = [
    { key: 'advocate_name', label: 'Advocate', render: (item: any) => item.advocate_name || 'Anonymous' },
    { key: 'campaign_title', label: 'Campaign', render: (item: any) => item.campaign_title || '—' },
    { key: 'platform', label: 'Platform', render: (item: any) => <span style={{ textTransform: 'capitalize' as const }}>{item.platform}</span> },
    { key: 'score_final', label: 'Score', sortable: true, render: (item: any) => (
      <span style={{ fontWeight: 600 }}>{item.score_final ? Math.round(item.score_final) : '—'}</span>
    )},
    { key: 'review_status', label: 'Status', render: (item: any) => <StatusBadge status={item.review_status || item.scoring_status || 'pending'} size="sm" /> },
    { key: 'fraud_risk_level', label: 'Fraud Risk', render: (item: any) => item.fraud_risk_level ? <StatusBadge status={item.fraud_risk_level} size="sm" /> : <span style={{ color: 'var(--color-text-muted)' }}>—</span> },
    { key: 'created_at', label: 'Date', sortable: true, render: (item: any) => new Date(item.created_at).toLocaleDateString() },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>All Submissions</h1>
        <p>View and filter all submissions across the platform.</p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        {['all', 'pending', 'approved', 'rejected', 'flagged_for_review'].map((s) => (
          <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            style={{ textTransform: 'capitalize' }}>
            {s === 'flagged_for_review' ? 'Flagged' : s}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={submissions} total={total} page={page} limit={20}
        onPageChange={setPage} loading={loading} emptyMessage="No submissions found." />
    </div>
  );
}
