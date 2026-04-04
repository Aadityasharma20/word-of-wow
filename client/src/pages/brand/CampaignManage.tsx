import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card } from '../../components/shared/Card';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { DataTable } from '../../components/shared/DataTable';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import { ArrowLeft, CheckCircle, XCircle, Plus } from 'lucide-react';

export default function CampaignManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [tab, setTab] = useState<'submissions' | 'coupons' | 'analytics'>('submissions');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // Add-coupons state (per tier)
  const [addCodesText, setAddCodesText] = useState<Record<string, string>>({});
  const [addingTierId, setAddingTierId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [campRes, subsRes] = await Promise.all([
        api.get(`/campaigns/${id}`),
        api.get(`/submissions?campaignId=${id}`),
      ]);
      setCampaign(campRes.data.data);
      setSubmissions(subsRes.data.data || []);
    } catch { /* empty */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.patch(`/campaigns/${id}/status`, { status: newStatus });
      setCampaign({ ...campaign, status: newStatus });
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to update status';
      alert(msg);
    }
  };

  const handleReview = async (submissionId: string, action: 'approve' | 'reject') => {
    setReviewingId(submissionId);
    try {
      await api.patch(`/submissions/${submissionId}/review`, { action });
      // Update local state
      setSubmissions(prev => prev.map(s =>
        s.id === submissionId
          ? { ...s, review_status: action === 'approve' ? 'approved' : 'rejected' }
          : s
      ));
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to review submission');
    } finally {
      setReviewingId(null);
    }
  };

  const handleAddCoupons = async (tierId: string) => {
    const text = addCodesText[tierId];
    if (!text?.trim()) return;
    setAddingTierId(tierId);
    try {
      const codes = text.split('\n').map(c => c.trim()).filter(Boolean);
      await api.post(`/campaigns/${id}/coupons/upload`, { tierId, codes });
      setAddCodesText(prev => ({ ...prev, [tierId]: '' }));
      // Refresh campaign to update tier counts
      const campRes = await api.get(`/campaigns/${id}`);
      setCampaign(campRes.data.data);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to add coupons');
    } finally {
      setAddingTierId(null);
    }
  };

  if (loading) return <LoadingSkeleton lines={8} height={24} />;
  if (!campaign) return <p style={{ color: 'var(--color-text-muted)', padding: '2rem' }}>Campaign not found.</p>;

  const subColumns = [
    { key: 'advocate_name', label: 'Advocate', render: (item: any) => item.advocate_name || 'Anonymous' },
    { key: 'platform', label: 'Platform', render: (item: any) => <span style={{ textTransform: 'capitalize' as const }}>{item.platform}</span> },
    { key: 'submitted_content', label: 'Content', render: (item: any) => {
      const content = item.submitted_content || item.fetched_content || '';
      const preview = content.length > 80 ? content.slice(0, 80) + '…' : content;
      return (
        <span title={content} style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', cursor: 'default' }}>
          {preview || '—'}
        </span>
      );
    }},
    { key: 'score_final', label: 'Score', sortable: true, render: (item: any) => (
      <span style={{ fontWeight: 600 }}>{item.score_final ? Math.round(item.score_final) : '—'}</span>
    )},
    { key: 'review_status', label: 'Status', render: (item: any) => <StatusBadge status={item.review_status || 'pending'} size="sm" /> },
    { key: 'created_at', label: 'Date', render: (item: any) => new Date(item.created_at).toLocaleDateString() },
    { key: 'actions', label: 'Actions', render: (item: any) => {
      const canReview = item.review_status === 'pending_brand_review' || item.review_status === 'pending';
      if (!canReview) return null;
      const isReviewing = reviewingId === item.id;
      return (
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <button
            className="btn btn-sm"
            disabled={isReviewing}
            onClick={(e) => { e.stopPropagation(); handleReview(item.id, 'approve'); }}
            style={{
              padding: '0.25rem 0.5rem', fontSize: '0.75rem',
              background: 'rgba(0,210,106,0.15)', color: 'var(--color-success)',
              border: '1px solid rgba(0,210,106,0.3)', borderRadius: 'var(--radius-md)',
            }}
          >
            <CheckCircle size={13} /> Approve
          </button>
          <button
            className="btn btn-sm"
            disabled={isReviewing}
            onClick={(e) => { e.stopPropagation(); handleReview(item.id, 'reject'); }}
            style={{
              padding: '0.25rem 0.5rem', fontSize: '0.75rem',
              background: 'rgba(225,112,85,0.15)', color: 'var(--color-danger)',
              border: '1px solid rgba(225,112,85,0.3)', borderRadius: 'var(--radius-md)',
            }}
          >
            <XCircle size={13} /> Reject
          </button>
        </div>
      );
    }},
  ];

  const tiers = campaign.coupon_tiers || [];

  return (
    <div className="animate-fade-in">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 'var(--space-md)' }}>
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header */}
      <Card style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>{campaign.title}</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{campaign.description}</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
              Approval: <strong style={{ color: campaign.auto_approve !== false ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {campaign.auto_approve !== false ? '⚡ Auto' : '✋ Manual'}
              </strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
            <StatusBadge status={campaign.status} />
            {campaign.status === 'draft' && (
              <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange('active')}>🚀 Launch</button>
            )}
            {campaign.status === 'active' && (
              <button className="btn btn-ghost btn-sm" onClick={() => handleStatusChange('paused')}>Pause</button>
            )}
            {campaign.status === 'paused' && (
              <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange('active')}>Resume</button>
            )}
            {(campaign.status === 'active' || campaign.status === 'paused') && (
              <button className="btn btn-ghost btn-sm" onClick={() => handleStatusChange('completed')}>Complete</button>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: 'var(--space-lg)', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        {(['submissions', 'coupons', 'analytics'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`}
            style={{ textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'submissions' && (
        <DataTable columns={subColumns} data={submissions} emptyMessage="No submissions yet." />
      )}

      {tab === 'coupons' && (
        <div className="stats-grid">
          {tiers.map((tier: any) => (
            <Card key={tier.id}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-success)', marginBottom: '0.5rem' }}>
                {tier.discount_percent}% OFF
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Score {tier.min_score}–{tier.max_score}</p>
              <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <p>Total: <strong>{tier.total_codes || 0}</strong></p>
                <p>Assigned: <strong>{tier.assigned_codes || 0}</strong></p>
                <p>Remaining: <strong style={{ color: 'var(--color-success)' }}>{(tier.total_codes || 0) - (tier.assigned_codes || 0)}</strong></p>
              </div>

              {/* Add more coupons */}
              <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                <textarea
                  className="input"
                  placeholder="Paste codes (one per line)"
                  value={addCodesText[tier.id] || ''}
                  onChange={(e) => setAddCodesText(prev => ({ ...prev, [tier.id]: e.target.value }))}
                  style={{ minHeight: 60, fontSize: '0.8rem' }}
                />
                <button
                  className="btn btn-primary btn-sm w-full"
                  onClick={() => handleAddCoupons(tier.id)}
                  disabled={addingTierId === tier.id || !addCodesText[tier.id]?.trim()}
                  style={{ marginTop: '0.35rem', gap: '0.25rem' }}
                >
                  <Plus size={14} />
                  {addingTierId === tier.id ? 'Adding...' : 'Add Codes'}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'analytics' && (
        <Card>
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
            <p>📊 Analytics dashboard coming soon.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Total submissions: <strong>{submissions.length}</strong> |
              Approval rate: <strong>{submissions.length > 0 ? Math.round(submissions.filter((s: any) => s.review_status === 'approved').length / submissions.length * 100) : 0}%</strong>
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
