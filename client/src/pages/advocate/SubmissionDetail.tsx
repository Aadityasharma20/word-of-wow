import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card } from '../../components/shared/Card';
import { ScoreBreakdown } from '../../components/shared/ScoreBreakdown';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { CouponCard } from '../../components/shared/CouponCard';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import { ArrowLeft, ExternalLink, ChevronDown, ChevronUp, Loader } from 'lucide-react';

export default function SubmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showReasoning, setShowReasoning] = useState(false);

  const fetchSubmission = async () => {
    try {
      const res = await api.get(`/submissions/${id}`);
      setSubmission(res.data.data);
    } catch { /* empty */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchSubmission();
  }, [id]);

  // Poll if still processing
  useEffect(() => {
    if (!submission) return;
    const status = submission.scoring_status;
    if (status === 'pending' || status === 'processing') {
      const interval = setInterval(fetchSubmission, 5000);
      return () => clearInterval(interval);
    }
  }, [submission?.scoring_status]);

  if (loading) return <LoadingSkeleton lines={8} height={24} />;
  if (!submission) return <p style={{ color: 'var(--color-text-muted)', padding: '2rem' }}>Submission not found.</p>;

  const isProcessing = submission.scoring_status === 'pending' || submission.scoring_status === 'processing';
  const isScored = submission.scoring_status === 'scored';

  return (
    <div className="animate-fade-in" style={{ maxWidth: 700, margin: '0 auto' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 'var(--space-md)' }}>
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header */}
      <Card style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Submission Details</h2>
          <StatusBadge status={submission.review_status || submission.scoring_status || 'pending'} />
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <p><span style={{ color: 'var(--color-text-muted)' }}>Campaign:</span> {submission.campaign_title || '—'}</p>
          <p><span style={{ color: 'var(--color-text-muted)' }}>Platform:</span> <span style={{ textTransform: 'capitalize' }}>{submission.platform}</span></p>
          <p><span style={{ color: 'var(--color-text-muted)' }}>Submitted:</span> {new Date(submission.created_at).toLocaleString()}</p>
          {submission.submitted_url && (
            <a href={submission.submitted_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-primary-light)' }}>
              View Post <ExternalLink size={12} />
            </a>
          )}
        </div>
      </Card>

      {/* Processing State */}
      {isProcessing && (
        <Card style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <Loader size={40} color="var(--color-primary)" style={{ animation: 'spin 2s linear infinite', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>AI is analyzing your submission...</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
            This usually takes 30-60 seconds. This page auto-refreshes.
          </p>
        </Card>
      )}

      {/* Score Results */}
      {isScored && (
        <>
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <ScoreBreakdown
              contentQuality={submission.score_content_quality}
              brandRelevance={submission.score_brand_relevance}
              authenticity={submission.score_authenticity}
              engagement={submission.score_engagement}
              audienceRelevance={submission.score_audience_relevance}
              finalScore={submission.score_final}
            />
          </div>

          {/* AI Reasoning */}
          {submission.score_reasoning && (
            <Card style={{ marginBottom: 'var(--space-lg)' }}>
              <button onClick={() => setShowReasoning(!showReasoning)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', background: 'none', border: 'none', color: 'var(--color-text)',
                  cursor: 'pointer', fontSize: '1rem', fontWeight: 600, padding: 0,
                }}>
                🧠 AI Reasoning
                {showReasoning ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {showReasoning && (
                <p style={{
                  marginTop: '0.75rem', fontSize: '0.85rem',
                  color: 'var(--color-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                }}>
                  {submission.score_reasoning}
                </p>
              )}
            </Card>
          )}

          {/* Fraud Status */}
          <Card style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>🔒 Fraud Status</h3>
            {submission.fraud_risk_level === 'none' || !submission.fraud_risk_level ? (
              <p style={{ color: 'var(--color-success)', fontSize: '0.9rem' }}>✅ No issues detected</p>
            ) : (
              <div>
                <StatusBadge status={submission.fraud_risk_level} />
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>Under review</p>
              </div>
            )}
          </Card>

          {/* Coupon Reward */}
          {submission.review_status === 'approved' && submission.coupon_code && (
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>🎁 Your Reward</h3>
              <CouponCard
                code={submission.coupon_code}
                discountPercent={submission.discount_percent || 0}
                campaignName={submission.campaign_title || ''}
                expiresAt={submission.coupon_expires_at}
              />
            </div>
          )}
        </>
      )}

      {/* Content Preview */}
      <Card>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>📝 Submitted Content</h3>
        <p style={{
          fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6,
          whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto',
        }}>
          {submission.fetched_content || submission.submitted_content || 'No content available.'}
        </p>
      </Card>
    </div>
  );
}
