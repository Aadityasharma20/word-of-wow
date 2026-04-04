import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Card } from '../../components/shared/Card';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ScoreBreakdown } from '../../components/shared/ScoreBreakdown';
import { Modal } from '../../components/shared/Modal';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';

type QueueTab = 'flagged' | 'wow_team' | 'brand_pending';

export default function ReviewQueue() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<QueueTab>('wow_team');

  const fetchQueue = async () => {
    setLoading(true);
    try {
      // Fetch all review-relevant statuses
      const [flaggedRes, wowRes, brandRes] = await Promise.all([
        api.get('/submissions?status=flagged_for_review&sortBy=created_at&sortOrder=asc&limit=100'),
        api.get('/submissions?status=pending_wow_review&sortBy=created_at&sortOrder=asc&limit=100'),
        api.get('/submissions?status=pending_brand_review&sortBy=created_at&sortOrder=asc&limit=100'),
      ]);
      setSubmissions([
        ...(flaggedRes.data.data || []).map((s: any) => ({ ...s, _queue: 'flagged' })),
        ...(wowRes.data.data || []).map((s: any) => ({ ...s, _queue: 'wow_team' })),
        ...(brandRes.data.data || []).map((s: any) => ({ ...s, _queue: 'brand_pending' })),
      ]);
    } catch { /* empty */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchQueue(); }, []);

  const filteredSubmissions = submissions.filter(s => s._queue === activeTab);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selected) return;
    setActionLoading(true);
    try {
      // Use the submissions review endpoint (works for both brand and admin)
      await api.patch(`/submissions/${selected.id}/review`, {
        action, notes: notes || (action === 'approve' ? 'Approved by WoW Team' : 'Rejected by WoW Team'),
      });
      setSubmissions(submissions.filter((s: any) => s.id !== selected.id));
      setSelected(null);
      setNotes('');
    } catch { /* empty */ }
    finally { setActionLoading(false); }
  };

  if (loading) return <LoadingSkeleton lines={8} height={24} />;

  const tabCounts = {
    flagged: submissions.filter(s => s._queue === 'flagged').length,
    wow_team: submissions.filter(s => s._queue === 'wow_team').length,
    brand_pending: submissions.filter(s => s._queue === 'brand_pending').length,
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Review Queue</h1>
        <p>{submissions.length} total submission{submissions.length !== 1 ? 's' : ''} pending review.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-lg)', background: 'var(--color-surface)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
        {([
          { id: 'wow_team' as QueueTab, label: '🛡️ WoW Team', count: tabCounts.wow_team },
          { id: 'flagged' as QueueTab, label: '⚠️ Flagged', count: tabCounts.flagged },
          { id: 'brand_pending' as QueueTab, label: '⏳ Brand Pending', count: tabCounts.brand_pending },
        ]).map(tab => (
          <button key={tab.id}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, fontSize: '0.82rem', padding: '0.5rem' }}>
            {tab.label} {tab.count > 0 && <span style={{ marginLeft: '0.3rem', background: 'rgba(255,255,255,0.2)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-full)', fontSize: '0.72rem' }}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {filteredSubmissions.length === 0 ? (
        <EmptyState message={
          activeTab === 'wow_team' ? 'No WoW Team reviews pending. All clear! 🎉' :
          activeTab === 'flagged' ? 'No flagged submissions. All clear! 🎉' :
          'No brand reviews pending.'
        } />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {filteredSubmissions.map((sub: any) => (
            <Card key={sub.id} onClick={() => setSelected(sub)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 600 }}>{sub.advocate_name || 'Anonymous'}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {sub.campaign_title || '—'} · {sub.platform} · {new Date(sub.created_at).toLocaleDateString()}
                  </p>
                  {/* Platform-specific info */}
                  {sub.platform === 'instagram' && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-primary-light)', marginTop: '0.2rem' }}>
                      📸 @{sub.instagram_handle} · {sub.instagram_type} · {sub.follower_count || 0} followers
                    </p>
                  )}
                  {sub.platform === 'review' && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-success)', marginTop: '0.2rem' }}>
                      {sub.review_type === 'video' ? '🎥 Video Review' : '✍️ Written Review'}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <span style={{ fontWeight: 600 }}>{sub.score_final ? Math.round(sub.score_final) : '—'}</span>
                  <StatusBadge status={sub.review_status || sub._queue} size="sm" />
                  {sub.fraud_flags?.length > 0 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-danger)', fontWeight: 600 }}>
                      ⚠ {sub.fraud_flags.length} flag{sub.fraud_flags.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={!!selected} onClose={() => { setSelected(null); setNotes(''); }} title="Review Submission" maxWidth="640px">
        {selected && (
          <div>
            {/* Content */}
            <Card style={{ marginBottom: 'var(--space-md)', background: 'var(--color-surface)' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Content Preview</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, maxHeight: 150, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                {selected.fetched_content || selected.submitted_content || 'No content'}
              </p>
              {selected.submitted_url && (
                <a href={selected.submitted_url} target="_blank" rel="noreferrer"
                  style={{ fontSize: '0.75rem', color: 'var(--color-primary-light)', marginTop: '0.5rem', display: 'block' }}>
                  🔗 View Original
                </a>
              )}
            </Card>

            {/* Instagram-specific info */}
            {selected.platform === 'instagram' && (
              <Card style={{ marginBottom: 'var(--space-md)', background: 'var(--color-surface)' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>📸 Instagram Details</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                  Handle: <strong>@{selected.instagram_handle}</strong> · Type: <strong>{selected.instagram_type}</strong> · Followers: <strong>{selected.follower_count}</strong>
                </p>
                {selected.proof_screenshot_url && (
                  <a href={selected.proof_screenshot_url} target="_blank" rel="noreferrer"
                    style={{ fontSize: '0.75rem', color: 'var(--color-primary-light)', marginTop: '0.3rem', display: 'block' }}>
                    📎 View Proof Screenshot
                  </a>
                )}
              </Card>
            )}

            {/* Score Breakdown (for Reddit/LinkedIn) */}
            {(selected.platform === 'reddit' || selected.platform === 'linkedin') && (
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <ScoreBreakdown
                  contentQuality={selected.score_content_quality}
                  brandRelevance={selected.score_brand_relevance}
                  authenticity={selected.score_authenticity}
                  engagement={selected.score_engagement}
                  audienceRelevance={selected.score_audience_relevance}
                  finalScore={selected.score_final}
                />
              </div>
            )}

            {/* Fraud Flags */}
            {selected.fraud_flags?.length > 0 && (
              <Card style={{ marginBottom: 'var(--space-md)', borderColor: 'rgba(225, 112, 85, 0.3)' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-danger)', marginBottom: '0.5rem' }}>⚠ Fraud Flags</h4>
                <ul style={{ paddingLeft: '1rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  {selected.fraud_flags.map((flag: string, i: number) => (
                    <li key={i} style={{ marginBottom: '0.25rem' }}>{flag}</li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Notes */}
            <div className="form-group">
              <label className="label">Review Notes</label>
              <textarea className="input" placeholder="Add notes about your decision (optional)..."
                value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: 80 }} />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleAction('reject')}
                disabled={actionLoading}>
                {actionLoading ? '...' : 'Reject'}
              </button>
              <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handleAction('approve')}
                disabled={actionLoading}>
                {actionLoading ? '...' : 'Approve'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
