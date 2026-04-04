import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card } from '../../components/shared/Card';
import { Modal } from '../../components/shared/Modal';
import { ArrowLeft } from 'lucide-react';

type Platform = 'reddit' | 'linkedin' | 'instagram' | 'review';

const PLATFORM_LABELS: Record<Platform, { emoji: string; label: string }> = {
  reddit: { emoji: '🔴', label: 'Reddit' },
  linkedin: { emoji: '🔵', label: 'LinkedIn' },
  instagram: { emoji: '📸', label: 'Instagram' },
  review: { emoji: '⭐', label: 'Review' },
};

export default function SubmitPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [platform, setPlatform] = useState<Platform>('reddit');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState('post');
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Instagram fields
  const [instagramHandle, setInstagramHandle] = useState('');
  const [instagramType, setInstagramType] = useState<'story' | 'reel' | 'both'>('both');
  const [followerCount, setFollowerCount] = useState<number>(0);

  // Review fields
  const [reviewType, setReviewType] = useState<'written' | 'video'>('written');

  useEffect(() => {
    api.get(`/campaigns/${campaignId}`).then(res => {
      const c = res.data.data;
      setCampaign(c);
      // Auto-select first available platform
      if (c.target_platforms?.length > 0) setPlatform(c.target_platforms[0]);
    }).catch(() => {});
  }, [campaignId]);

  // Auto-detect platform from URL
  useEffect(() => {
    if (url.includes('reddit.com')) setPlatform('reddit');
    else if (url.includes('linkedin.com')) setPlatform('linkedin');
  }, [url]);

  const availablePlatforms = (campaign?.target_platforms || []) as Platform[];
  const igConfig = campaign?.instagram_config || {};
  const revConfig = campaign?.review_config || {};
  const isContentPlatform = platform === 'reddit' || platform === 'linkedin';

  const canSubmit = () => {
    if (isContentPlatform) return url.length > 0 && content.length >= 10;
    if (platform === 'instagram') return instagramHandle.length > 0 && followerCount >= (igConfig.minFollowers || 200);
    if (platform === 'review') return content.length >= 10;
    return false;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload: any = { campaignId, platform };

      if (isContentPlatform) {
        payload.url = url;
        payload.content = content;
        payload.contentType = contentType;
      } else if (platform === 'instagram') {
        payload.instagramHandle = instagramHandle;
        payload.instagramType = instagramType;
        payload.followerCount = followerCount;
        payload.contentType = instagramType;
        payload.content = `Instagram ${instagramType} by @${instagramHandle}`;
        if (url) payload.proofScreenshotUrl = url;
      } else if (platform === 'review') {
        payload.reviewType = reviewType;
        payload.content = content;
        payload.contentType = reviewType === 'video' ? 'video_review' : 'written_review';
        if (url) payload.url = url;
      }

      const res = await api.post('/submissions', payload);
      navigate(`/advocate/submissions/${res.data.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Submission failed');
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 700, margin: '0 auto' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 'var(--space-md)' }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="page-header">
        <h1>Submit Your Content</h1>
        {campaign && <p>Campaign: <strong>{campaign.title}</strong></p>}
      </div>

      {error && (
        <div style={{
          padding: '0.75rem 1rem', background: 'rgba(225, 112, 85, 0.15)',
          border: '1px solid rgba(225, 112, 85, 0.3)', borderRadius: 'var(--radius-md)',
          color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: 'var(--space-md)',
        }}>
          {error}
        </div>
      )}

      <Card>
        {/* Platform selector */}
        <div className="form-group">
          <label className="label">Platform</label>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(availablePlatforms.length, 4)}, 1fr)`, gap: 'var(--space-sm)' }}>
            {availablePlatforms.map((p: Platform) => (
              <button key={p} className={`btn ${platform === p ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPlatform(p)} style={{ textTransform: 'capitalize' }}>
                {PLATFORM_LABELS[p]?.emoji} {PLATFORM_LABELS[p]?.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Reddit / LinkedIn Fields ─── */}
        {isContentPlatform && (
          <>
            <div className="form-group">
              <label className="label">Post URL</label>
              <input className="input" placeholder={`Paste your ${platform} post URL...`}
                value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Content Type</label>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                {['post', 'comment'].map((ct) => (
                  <button key={ct} className={`btn ${contentType === ct ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setContentType(ct)} style={{ flex: 1, textTransform: 'capitalize' }}>
                    {ct}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="label">Content (paste your post/comment text)</label>
              <textarea className="input" placeholder="Paste the text of your post or comment..."
                value={content} onChange={(e) => setContent(e.target.value)}
                style={{ minHeight: 150 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                <p style={{ fontSize: '0.7rem', color: content.length < 10 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                  Min 10 characters
                </p>
                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{content.length} chars</p>
              </div>
            </div>
          </>
        )}

        {/* ─── Instagram Fields ─── */}
        {platform === 'instagram' && (
          <>
            <div className="form-group">
              <label className="label">Instagram Handle</label>
              <input className="input" placeholder="@yourusername" value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value.replace('@', ''))} />
            </div>
            <div className="form-group">
              <label className="label">Content Type</label>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                {(['story', 'reel', 'both'] as const).map((t) => (
                  <button key={t} className={`btn ${instagramType === t ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setInstagramType(t)} style={{ flex: 1, textTransform: 'capitalize' }}>
                    {t === 'both' ? '📸 Story + Reel' : t === 'story' ? '📱 Story' : '🎬 Reel'}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                {instagramType === 'story' ? 'Story must be live for 24 hours' :
                 instagramType === 'reel' ? 'Reel must be live for 24 hours' :
                 'Both story & reel must be live for 24 hours'}
              </p>
            </div>
            <div className="form-group">
              <label className="label">Your Follower Count</label>
              <input className="input" type="number" placeholder="e.g. 5000" value={followerCount || ''}
                onChange={(e) => setFollowerCount(parseInt(e.target.value) || 0)} />
              <p style={{ fontSize: '0.72rem', color: followerCount < (igConfig.minFollowers || 200) ? 'var(--color-danger)' : 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                Minimum {igConfig.minFollowers || 200} followers required
              </p>
            </div>
            <div className="form-group">
              <label className="label">Proof Screenshot URL (optional)</label>
              <input className="input" placeholder="Link to screenshot of your story/reel..."
                value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
          </>
        )}

        {/* ─── Review Fields ─── */}
        {platform === 'review' && (
          <>
            <div className="form-group">
              <label className="label">Review Type</label>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <button className={`btn ${reviewType === 'written' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setReviewType('written')} style={{ flex: 1 }}>
                  ✍️ Written Review ({revConfig.writtenCouponPercent || 15}% OFF)
                </button>
                <button className={`btn ${reviewType === 'video' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setReviewType('video')} style={{ flex: 1 }}>
                  🎥 Video Review ({revConfig.videoCouponPercent || 30}% OFF)
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="label">Review URL (link to your review)</label>
              <input className="input" placeholder="Paste the URL of your published review..."
                value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">{reviewType === 'video' ? 'Description of your video review' : 'Your written review text'}</label>
              <textarea className="input"
                placeholder={reviewType === 'video' ? 'Briefly describe what your video covers...' : 'Paste your full review text here...'}
                value={content} onChange={(e) => setContent(e.target.value)}
                style={{ minHeight: reviewType === 'video' ? 80 : 150 }} />
              {reviewType === 'written' && (
                <p style={{ fontSize: '0.72rem', color: content.split(/\s+/).filter(Boolean).length < (revConfig.minWordCount || 50) ? 'var(--color-danger)' : 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  {content.split(/\s+/).filter(Boolean).length} / {revConfig.minWordCount || 50} words minimum
                </p>
              )}
            </div>
          </>
        )}

        {/* Campaign Guidelines */}
        {campaign?.guidelines && (
          <div style={{
            padding: '0.75rem', background: 'rgba(108, 92, 231, 0.1)',
            borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)',
            borderLeft: '3px solid var(--color-primary)',
          }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-primary-light)' }}>📋 Campaign Guidelines</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{campaign.guidelines}</p>
          </div>
        )}

        {/* Submit */}
        <button className="btn btn-primary btn-lg w-full"
          disabled={!canSubmit() || submitting}
          onClick={() => setShowConfirm(true)}
          style={{ marginTop: 'var(--space-sm)' }}>
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </Card>

      {/* Confirmation Modal */}
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Submission">
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          {isContentPlatform
            ? 'Your content will be scored by AI across 5 dimensions.'
            : platform === 'instagram'
            ? `Your Instagram ${instagramType} submission will be reviewed.`
            : `Your ${reviewType} review will be submitted for approval.`}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-ghost" onClick={() => setShowConfirm(false)} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ flex: 1 }}>
            {submitting ? 'Submitting...' : 'Confirm Submit'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
