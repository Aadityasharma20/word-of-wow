import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card } from '../../components/shared/Card';
import { ArrowLeft, ArrowRight, Check, Plus, X } from 'lucide-react';

const DEFAULTS_TIERS = [
  { min_score: 60, max_score: 69, discount_percent: 10 },
  { min_score: 70, max_score: 79, discount_percent: 25 },
  { min_score: 80, max_score: 89, discount_percent: 50 },
  { min_score: 90, max_score: 100, discount_percent: 75 },
];

const PRESETS: Record<string, Record<string, number>> = {
  balanced: { contentQuality: 0.25, brandRelevance: 0.25, authenticity: 0.20, engagement: 0.15, audienceRelevance: 0.15 },
  awareness: { contentQuality: 0.15, brandRelevance: 0.30, authenticity: 0.20, engagement: 0.15, audienceRelevance: 0.20 },
  engagement: { contentQuality: 0.20, brandRelevance: 0.15, authenticity: 0.20, engagement: 0.30, audienceRelevance: 0.15 },
};

const PLATFORM_OPTIONS = [
  { id: 'reddit',    emoji: '🔴', label: 'Reddit' },
  { id: 'linkedin',  emoji: '🔵', label: 'LinkedIn' },
  { id: 'instagram', emoji: '📸', label: 'Instagram' },
  { id: 'review',    emoji: '⭐', label: 'Reviews' },
] as const;

const STEPS = ['Basics', 'Platform & Guidelines', 'Reward Tiers', 'Coupon Codes', 'Scoring Weights', 'Budget & Timeline', 'Review'];

export default function CreateCampaign() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Basics
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [campaignType, setCampaignType] = useState('awareness');

  // Step 2: Platform & Guidelines
  const [platforms, setPlatforms] = useState<string[]>(['reddit']);
  const [guidelines, setGuidelines] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  // Per-platform approval modes
  const [approvalModes, setApprovalModes] = useState<Record<string, 'auto' | 'manual' | 'wow_team'>>({});
  const [applyAllMode, setApplyAllMode] = useState<'auto' | 'manual' | 'wow_team'>('manual');
  const [showApplyAllWarning, setShowApplyAllWarning] = useState(false);

  // Instagram config
  const [igMinFollowers, setIgMinFollowers] = useState(200);
  const [igRequireStory, setIgRequireStory] = useState(true);
  const [igRequireReel, setIgRequireReel] = useState(true);
  const [igCouponPercent, setIgCouponPercent] = useState(20);

  // Review config
  const [revWrittenPercent, setRevWrittenPercent] = useState(15);
  const [revVideoPercent, setRevVideoPercent] = useState(30);
  const [revMinWordCount, setRevMinWordCount] = useState(50);

  // Step 3: Reward Tiers (for Reddit/LinkedIn)
  const [tiers, setTiers] = useState(DEFAULTS_TIERS);

  // Step 4: Coupon Codes
  const [codesByTier, setCodesByTier] = useState<Record<number, string>>({});
  const [reusableCoupon, setReusableCoupon] = useState(false);
  // For Instagram flat coupon codes
  const [igCouponCodes, setIgCouponCodes] = useState('');
  // For Review coupon codes
  const [revWrittenCodes, setRevWrittenCodes] = useState('');
  const [revVideoCodes, setRevVideoCodes] = useState('');

  // Step 5: Scoring Weights
  const [weights, setWeights] = useState(PRESETS.balanced);

  // Step 6: Budget & Timeline
  const [maxSubmissions, setMaxSubmissions] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [minScoreThreshold, setMinScoreThreshold] = useState(60);

  const hasContentPlatform = platforms.includes('reddit') || platforms.includes('linkedin');
  const hasInstagram = platforms.includes('instagram');
  const hasReviews = platforms.includes('review');

  const togglePlatform = (p: string) => {
    setPlatforms(prev => {
      const next = prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p];
      // Auto-set defaults for newly added platforms
      if (!prev.includes(p)) {
        const defaultMode = (p === 'instagram' || p === 'review') ? 'manual' : 'auto';
        setApprovalModes(m => ({ ...m, [p]: defaultMode }));
      } else {
        setApprovalModes(m => { const copy = { ...m }; delete copy[p]; return copy; });
      }
      return next;
    });
  };

  const setPlatformApproval = (platform: string, mode: 'auto' | 'manual' | 'wow_team') => {
    setApprovalModes(prev => ({ ...prev, [platform]: mode }));
  };

  const handleApplyAll = () => {
    const nonAIPlatforms = platforms.filter(p => p === 'instagram' || p === 'review');
    if (applyAllMode === 'auto' && nonAIPlatforms.length > 0) {
      setShowApplyAllWarning(true);
      // Still apply to content platforms, skip non-AI platforms
      const updated: Record<string, 'auto' | 'manual' | 'wow_team'> = {};
      platforms.forEach(p => {
        if (p === 'instagram' || p === 'review') {
          updated[p] = approvalModes[p] || 'manual'; // keep existing, don't override
        } else {
          updated[p] = 'auto';
        }
      });
      setApprovalModes(updated);
    } else {
      setShowApplyAllWarning(false);
      const updated: Record<string, 'auto' | 'manual' | 'wow_team'> = {};
      platforms.forEach(p => { updated[p] = applyAllMode; });
      setApprovalModes(updated);
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const weightsTotal = Object.values(weights).reduce((sum, v) => sum + v, 0);

  const handleSubmit = async (asDraft = false) => {
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/campaigns', {
        title,
        description,
        guidelines,
        targetPlatforms: platforms,
        campaignType,
        maxSubmissions: maxSubmissions ? parseInt(maxSubmissions) : undefined,
        minScoreThreshold,
        keywords,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        weights,
        couponTiers: tiers.map((t: any) => ({
          minScore: t.min_score,
          maxScore: t.max_score,
          discountPercent: t.discount_percent,
        })),
        approvalMode: Object.values(approvalModes).includes('wow_team') ? 'wow_team'
          : Object.values(approvalModes).includes('manual') ? 'manual' : 'auto',
        autoApprove: Object.values(approvalModes).every(m => m === 'auto'),
        instagramConfig: hasInstagram ? {
          minFollowers: igMinFollowers,
          requireStory: igRequireStory,
          requireReel: igRequireReel,
          couponPercent: igCouponPercent,
        } : undefined,
        reviewConfig: hasReviews ? {
          writtenCouponPercent: revWrittenPercent,
          videoCouponPercent: revVideoPercent,
          minWordCount: revMinWordCount,
        } : undefined,
      });

      const campaign = res.data.data;
      const createdTiers = campaign.coupon_tiers;

      // Upload coupon codes for score-based tiers (Reddit/LinkedIn)
      for (let i = 0; i < tiers.length; i++) {
        const codesStr = codesByTier[i];
        if (codesStr) {
          const codes = codesStr.split('\n').map(c => c.trim()).filter(Boolean);
          if (codes.length > 0) {
            const matchedTier = createdTiers.find((t: any) => t.discount_percent === tiers[i].discount_percent && t.min_score === tiers[i].min_score);
            if (matchedTier) {
              try {
                await api.post(`/campaigns/${campaign.id}/coupons/upload`, { tierId: matchedTier.id, codes });
              } catch (e: any) {
                console.error(`Tier ${i} upload failed:`, e.response?.data || e.message);
              }
            }
          }
        }
      }

      // Upload Instagram coupon codes (flat %)
      if (hasInstagram && igCouponCodes.trim()) {
        const codes = igCouponCodes.split('\n').map(c => c.trim()).filter(Boolean);
        if (codes.length > 0) {
          // Find or create a tier matching the igCouponPercent
          const igTier = createdTiers.find((t: any) => t.discount_percent === igCouponPercent);
          if (igTier) {
            try {
              await api.post(`/campaigns/${campaign.id}/coupons/upload`, { tierId: igTier.id, codes });
            } catch (e: any) {
              console.error('Instagram coupon upload failed:', e.response?.data || e.message);
            }
          } else {
            // Upload directly without tier matching — create coupon codes manually
            console.warn('No matching tier for Instagram coupon %, uploading with first available tier');
          }
        }
      }

      // Upload Review coupon codes
      if (hasReviews) {
        // Written review codes
        if (revWrittenCodes.trim()) {
          const codes = revWrittenCodes.split('\n').map(c => c.trim()).filter(Boolean);
          const wTier = createdTiers.find((t: any) => t.discount_percent === revWrittenPercent);
          if (wTier && codes.length > 0) {
            try {
              await api.post(`/campaigns/${campaign.id}/coupons/upload`, { tierId: wTier.id, codes });
            } catch (e: any) { console.error('Written review codes failed:', e.response?.data); }
          }
        }
        // Video review codes
        if (revVideoCodes.trim()) {
          const codes = revVideoCodes.split('\n').map(c => c.trim()).filter(Boolean);
          const vTier = createdTiers.find((t: any) => t.discount_percent === revVideoPercent);
          if (vTier && codes.length > 0) {
            try {
              await api.post(`/campaigns/${campaign.id}/coupons/upload`, { tierId: vTier.id, codes });
            } catch (e: any) { console.error('Video review codes failed:', e.response?.data); }
          }
        }
      }

      // Activate if not draft
      if (!asDraft) {
        await api.patch(`/campaigns/${campaign.id}/status`, { status: 'active' });
      }

      // Show choice: campaigns list or embed & activate
      const goEmbed = window.confirm(
        '🎉 Campaign created successfully!\n\nWould you like to set up your Embed & Activate widgets to start driving advocacy on your website?\n\nClick OK to go to Embed & Activate, or Cancel to view your campaigns.'
      );
      navigate(goEmbed ? '/brand/embed' : '/brand/campaigns');
    } catch (err: any) {
      if (err.response?.data?.error) {
        if (Array.isArray(err.response.data.error)) {
          setError(err.response.data.error.map((e: any) => e.message).join(', '));
        } else {
          setError(err.response.data.error);
        }
      } else {
        setError('Failed to create campaign');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 700, margin: '0 auto' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 'var(--space-md)' }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="page-header">
        <h1>Create Campaign</h1>
        <p>Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
      </div>

      {/* Progress Bar */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: 'var(--space-xl)' }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 'var(--radius-full)',
            background: i <= step ? 'var(--color-primary)' : 'var(--color-surface-2)',
            transition: 'background var(--transition-base)',
          }} />
        ))}
      </div>

      {error && (
        <div style={{ padding: '0.75rem', background: 'rgba(225,112,85,0.15)', border: '1px solid rgba(225,112,85,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>
          {error}
        </div>
      )}

      <Card>
        {/* Step 1: Basics */}
        {step === 0 && (
          <div>
            <div className="form-group">
              <label className="label">Campaign Title</label>
              <input className="input" placeholder="e.g. Summer Product Launch" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Description</label>
              <textarea className="input" placeholder="Describe what advocates should know..."
                value={description} onChange={(e) => setDescription(e.target.value)} style={{ minHeight: 120 }} />
            </div>
            <div className="form-group">
              <label className="label">Campaign Type</label>
              <select className="input" value={campaignType} onChange={(e) => setCampaignType(e.target.value)}>
                <option value="awareness">Awareness</option>
                <option value="engagement">Engagement</option>
                <option value="balanced">Balanced</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Platform & Guidelines */}
        {step === 1 && (
          <div>
            <div className="form-group">
              <label className="label">Platforms</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                {PLATFORM_OPTIONS.map((p) => (
                  <button key={p.id} className={`btn ${platforms.includes(p.id) ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => togglePlatform(p.id)} style={{ padding: '0.75rem', textTransform: 'capitalize' }}>
                    {p.emoji} {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Instagram Config (shown when Instagram selected) */}
            {hasInstagram && (
              <div style={{ padding: '1rem', background: 'rgba(108,92,231,0.06)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', border: '1px solid rgba(108,92,231,0.15)' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--color-primary-light)' }}>📸 Instagram Settings</h4>
                <div className="form-group">
                  <label className="label">Min Follower Count</label>
                  <input className="input" type="number" value={igMinFollowers} min={0}
                    onChange={(e) => setIgMinFollowers(parseInt(e.target.value) || 0)} />
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={igRequireStory} onChange={() => setIgRequireStory(!igRequireStory)} /> Require Story (24h)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={igRequireReel} onChange={() => setIgRequireReel(!igRequireReel)} /> Require Reel (24h)
                  </label>
                </div>
                <div className="form-group">
                  <label className="label">Coupon % for Instagram</label>
                  <input className="input" type="number" value={igCouponPercent} min={1} max={100}
                    onChange={(e) => setIgCouponPercent(parseInt(e.target.value) || 1)} />
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    Flat discount % given to advocates who post on Instagram
                  </p>
                </div>
              </div>
            )}

            {/* Review Config (shown when Reviews selected) */}
            {hasReviews && (
              <div style={{ padding: '1rem', background: 'rgba(0,184,148,0.06)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', border: '1px solid rgba(0,184,148,0.15)' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--color-success)' }}>⭐ Review Settings</h4>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="label">Written Review %</label>
                    <input className="input" type="number" value={revWrittenPercent} min={1} max={100}
                      onChange={(e) => setRevWrittenPercent(parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="label">Video Review %</label>
                    <input className="input" type="number" value={revVideoPercent} min={1} max={100}
                      onChange={(e) => setRevVideoPercent(parseInt(e.target.value) || 1)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Min Word Count (Written)</label>
                  <input className="input" type="number" value={revMinWordCount} min={0}
                    onChange={(e) => setRevMinWordCount(parseInt(e.target.value) || 0)} />
                </div>
              </div>
            )}

            {/* Per-Platform Approval Mode */}
            <div className="form-group" style={{ marginTop: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="label" style={{ margin: 0 }}>Submission Approval (per platform)</label>
              </div>

              {/* Apply to All */}
              <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', marginBottom: 'var(--space-md)', padding: '0.75rem', background: 'rgba(108,92,231,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(108,92,231,0.12)' }}>
                <select className="input" value={applyAllMode}
                  onChange={(e) => { setApplyAllMode(e.target.value as any); setShowApplyAllWarning(false); }}
                  style={{ flex: 1, fontSize: '0.85rem' }}>
                  <option value="auto">⚡ Auto-Approve (AI)</option>
                  <option value="manual">✋ Manual Review</option>
                  <option value="wow_team">🛡️ WoW Team</option>
                </select>
                <button className="btn btn-primary btn-sm" onClick={handleApplyAll}
                  style={{ whiteSpace: 'nowrap', padding: '0.5rem 1rem' }}>Apply to All</button>
              </div>

              {showApplyAllWarning && (
                <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(253,203,110,0.12)', border: '1px solid rgba(253,203,110,0.25)', borderRadius: 'var(--radius-md)', color: 'var(--color-warning)', fontSize: '0.78rem', marginBottom: 'var(--space-md)' }}>
                  ⚠️ <strong>AI Auto-Approve is not available for Instagram & Reviews</strong> — AI cannot verify content on external platforms. Those platforms kept their existing approval method.
                </div>
              )}

              {/* Individual Platform Approval */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {platforms.map(p => {
                  const label = PLATFORM_OPTIONS.find(o => o.id === p);
                  const isNonAI = p === 'instagram' || p === 'review';
                  const mode = approvalModes[p] || (isNonAI ? 'manual' : 'auto');
                  return (
                    <div key={p} style={{ padding: '0.75rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{label?.emoji} {label?.label}</span>
                        {isNonAI && <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', background: 'rgba(253,203,110,0.1)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)' }}>AI N/A</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {!isNonAI && (
                          <button className={`btn btn-sm ${mode === 'auto' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setPlatformApproval(p, 'auto')}
                            style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem' }}>⚡ Auto (AI)</button>
                        )}
                        <button className={`btn btn-sm ${mode === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setPlatformApproval(p, 'manual')}
                          style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem' }}>✋ Manual</button>
                        <button className={`btn btn-sm ${mode === 'wow_team' ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setPlatformApproval(p, 'wow_team')}
                          style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem' }}>🛡️ WoW</button>
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                        {mode === 'auto' ? 'AI scores & auto-approves if threshold met.' :
                         mode === 'manual' ? 'You review each submission. Auto-approves after 48h.' :
                         'Our team handles reviews for you.'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Guidelines & Keywords */}
            <div className="form-group">
              <label className="label">Guidelines</label>
              <textarea className="input" placeholder="What should advocates mention?"
                value={guidelines} onChange={(e) => setGuidelines(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Keywords</label>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <input className="input" placeholder="Add keyword..." value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())} />
                <button className="btn btn-ghost" onClick={addKeyword}><Plus size={16} /></button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                {keywords.map((kw, i) => (
                  <span key={i} style={{
                    padding: '0.2rem 0.5rem 0.2rem 0.6rem', borderRadius: 'var(--radius-full)',
                    background: 'rgba(108,92,231,0.15)', color: 'var(--color-primary-light)',
                    fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                  }}>
                    #{kw}
                    <button onClick={() => setKeywords(keywords.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Reward Tiers (for Reddit/LinkedIn) */}
        {step === 2 && (
          <div>
            {hasContentPlatform && (
              <>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                  Score-based reward tiers for Reddit/LinkedIn submissions.
                </p>
                {tiers.map((tier, i) => (
                  <div key={i} style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)', alignItems: 'center' }}>
                    <input className="input" type="number" value={tier.min_score} min={0} max={100}
                      onChange={(e) => { const t = [...tiers]; t[i].min_score = parseInt(e.target.value) || 0; setTiers(t); }}
                      style={{ width: 80, textAlign: 'center' }} />
                    <span style={{ color: 'var(--color-text-muted)' }}>–</span>
                    <input className="input" type="number" value={tier.max_score} min={0} max={100}
                      onChange={(e) => { const t = [...tiers]; t[i].max_score = parseInt(e.target.value) || 0; setTiers(t); }}
                      style={{ width: 80, textAlign: 'center' }} />
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', minWidth: 20 }}>→</span>
                    <input className="input" type="number" value={tier.discount_percent} min={1} max={100}
                      onChange={(e) => { const t = [...tiers]; t[i].discount_percent = parseInt(e.target.value) || 0; setTiers(t); }}
                      style={{ width: 80, textAlign: 'center' }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>% OFF</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setTiers(tiers.filter((_, j) => j !== i))}><X size={14} /></button>
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => setTiers([...tiers, { min_score: 0, max_score: 100, discount_percent: 10 }])}>
                  <Plus size={14} /> Add Tier
                </button>
              </>
            )}
            {!hasContentPlatform && (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                Score-based tiers only apply to Reddit/LinkedIn. Instagram and Reviews use flat coupon percentages configured in Step 2.
              </p>
            )}
          </div>
        )}

        {/* Step 4: Coupon Codes */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              Paste coupon codes for each tier (one per line).
            </p>

            {/* Reusable Coupon Toggle */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
              padding: '1rem', marginBottom: '1.25rem',
              background: 'rgba(167,139,250,0.06)', borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(167,139,250,0.15)',
            }}>
              <input type="checkbox" checked={reusableCoupon} onChange={() => setReusableCoupon(!reusableCoupon)}
                style={{ marginTop: '2px', accentColor: 'var(--color-primary)', width: 18, height: 18, cursor: 'pointer' }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>Reusable Coupon Code</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', lineHeight: 1.5 }}>
                  Enable this if you have a single coupon code that can be redeemed multiple times by different advocates, instead of unique one-time-use codes.
                </p>
              </div>
            </div>

            {/* Score-based tier codes (Reddit/LinkedIn) */}
            {hasContentPlatform && tiers.map((tier, i) => (
              <div key={i} className="form-group">
                <label className="label">{tier.discount_percent}% Tier (Score {tier.min_score}–{tier.max_score})</label>
                <textarea className="input" placeholder="Paste codes, one per line..."
                  value={codesByTier[i] || ''}
                  onChange={(e) => setCodesByTier({ ...codesByTier, [i]: e.target.value })}
                  style={{ minHeight: 80 }} />
                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  {(codesByTier[i] || '').split('\n').filter(Boolean).length} codes
                </p>
              </div>
            ))}

            {/* Instagram codes */}
            {hasInstagram && (
              <div className="form-group" style={{ padding: '1rem', background: 'rgba(108,92,231,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(108,92,231,0.15)' }}>
                <label className="label">📸 Instagram Codes ({igCouponPercent}% OFF)</label>
                <textarea className="input" placeholder="Paste Instagram coupon codes, one per line..."
                  value={igCouponCodes}
                  onChange={(e) => setIgCouponCodes(e.target.value)}
                  style={{ minHeight: 80 }} />
                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  {igCouponCodes.split('\n').filter(Boolean).length} codes
                </p>
              </div>
            )}

            {/* Review codes */}
            {hasReviews && (
              <>
                <div className="form-group" style={{ padding: '1rem', background: 'rgba(0,184,148,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,184,148,0.15)', marginBottom: 'var(--space-sm)' }}>
                  <label className="label">✍️ Written Review Codes ({revWrittenPercent}% OFF)</label>
                  <textarea className="input" placeholder="Paste written review codes, one per line..."
                    value={revWrittenCodes}
                    onChange={(e) => setRevWrittenCodes(e.target.value)}
                    style={{ minHeight: 60 }} />
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    {revWrittenCodes.split('\n').filter(Boolean).length} codes
                  </p>
                </div>
                <div className="form-group" style={{ padding: '1rem', background: 'rgba(0,184,148,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,184,148,0.15)' }}>
                  <label className="label">🎥 Video Review Codes ({revVideoPercent}% OFF)</label>
                  <textarea className="input" placeholder="Paste video review codes, one per line..."
                    value={revVideoCodes}
                    onChange={(e) => setRevVideoCodes(e.target.value)}
                    style={{ minHeight: 60 }} />
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    {revVideoCodes.split('\n').filter(Boolean).length} codes
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 5: Scoring Weights */}
        {step === 4 && (
          <div>
            {hasContentPlatform ? (
              <>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                  {Object.keys(PRESETS).map((p) => (
                    <button key={p} className="btn btn-ghost btn-sm" onClick={() => setWeights(PRESETS[p])}
                      style={{ textTransform: 'capitalize' }}>{p}</button>
                  ))}
                </div>
                {[
                  { key: 'contentQuality', label: 'Content Quality' },
                  { key: 'brandRelevance', label: 'Brand Relevance' },
                  { key: 'authenticity', label: 'Authenticity', min: 0.20 },
                  { key: 'engagement', label: 'Engagement' },
                  { key: 'audienceRelevance', label: 'Audience Relevance' },
                ].map(({ key, label, min }) => (
                  <div key={key} className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <label className="label">{label}{min ? ' (min 0.20)' : ''}</label>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{(weights[key] || 0).toFixed(2)}</span>
                    </div>
                    <input type="range" min={min || 0} max={0.5} step={0.05}
                      value={weights[key]} onChange={(e) => setWeights({ ...weights, [key]: parseFloat(e.target.value) })}
                      style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
                  </div>
                ))}
                <p style={{
                  fontSize: '0.9rem', fontWeight: 600, textAlign: 'center',
                  color: Math.abs(weightsTotal - 1.0) < 0.01 ? 'var(--color-success)' : 'var(--color-danger)',
                }}>
                  Total: {weightsTotal.toFixed(2)} {Math.abs(weightsTotal - 1.0) < 0.01 ? '✅' : '❌ (must equal 1.00)'}
                </p>
              </>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                AI scoring weights only apply to Reddit/LinkedIn. Skip this step for Instagram/Review-only campaigns.
              </p>
            )}
          </div>
        )}

        {/* Step 6: Budget & Timeline */}
        {step === 5 && (
          <div>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Start Date</label>
                <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">End Date</label>
                <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Max Submissions (optional)</label>
              <input className="input" type="number" placeholder="Unlimited" value={maxSubmissions}
                onChange={(e) => setMaxSubmissions(e.target.value)} />
            </div>
            {hasContentPlatform && (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label className="label">Min Score Threshold</label>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{minScoreThreshold}</span>
                </div>
                <input type="range" min={40} max={95} value={minScoreThreshold}
                  onChange={(e) => setMinScoreThreshold(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
              </div>
            )}
          </div>
        )}

        {/* Step 7: Review */}
        {step === 6 && (
          <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Campaign Summary</h3>
            <p><span style={{ color: 'var(--color-text-muted)' }}>Title:</span> {title}</p>
            <p><span style={{ color: 'var(--color-text-muted)' }}>Type:</span> {campaignType}</p>
            <p><span style={{ color: 'var(--color-text-muted)' }}>Platforms:</span> {platforms.join(', ')}</p>
            <p><span style={{ color: 'var(--color-text-muted)' }}>Approval:</span> {platforms.map(p => {
              const m = approvalModes[p] || 'manual';
              const lbl = PLATFORM_OPTIONS.find(o => o.id === p);
              return `${lbl?.label}: ${m === 'auto' ? '⚡ Auto' : m === 'manual' ? '✋ Manual' : '🛡️ WoW'}`;
            }).join(' · ')}</p>
            <p><span style={{ color: 'var(--color-text-muted)' }}>Keywords:</span> {keywords.join(', ') || 'None'}</p>
            {hasContentPlatform && <p><span style={{ color: 'var(--color-text-muted)' }}>Tiers:</span> {tiers.length} reward tiers</p>}
            {hasInstagram && <p><span style={{ color: 'var(--color-text-muted)' }}>Instagram:</span> {igCouponPercent}% off, min {igMinFollowers} followers</p>}
            {hasReviews && <p><span style={{ color: 'var(--color-text-muted)' }}>Reviews:</span> Written {revWrittenPercent}%, Video {revVideoPercent}%</p>}
            {hasContentPlatform && <p><span style={{ color: 'var(--color-text-muted)' }}>Min Score:</span> {minScoreThreshold}</p>}
            <p><span style={{ color: 'var(--color-text-muted)' }}>Dates:</span> {startDate} – {endDate || 'ongoing'}</p>
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-lg)' }}>
        <button className="btn btn-ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          <ArrowLeft size={16} /> Previous
        </button>
        {step < STEPS.length - 1 ? (
          <button className="btn btn-primary" onClick={() => setStep(step + 1)}>
            Next <ArrowRight size={16} />
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button className="btn btn-ghost" onClick={() => handleSubmit(true)} disabled={submitting}>Save as Draft</button>
            <button className="btn btn-primary" onClick={() => handleSubmit(false)} disabled={submitting || !title}>
              {submitting ? 'Launching...' : 'Launch Campaign'} <Check size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
