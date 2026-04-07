import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader, Sparkles, Users, Award, ChevronRight, ExternalLink,
  Target, Shield, BookOpen, Zap, Gift, Star, ArrowRight,
  MessageSquare, Linkedin, Twitter, Globe, Copy, Check,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

/* ═══════════════════════════════════════════════════════
   Public Campaign Landing Page
   /campaign/:id
   Shows full campaign details + signup/participate CTA
   ═══════════════════════════════════════════════════════ */

interface RewardTier {
  minScore: number;
  maxScore: number;
  discountPercent: number;
}

interface CampaignPublicData {
  id: string;
  title: string;
  description: string;
  guidelines: string | null;
  platforms: string[];
  campaignType: string;
  keywords: string[] | null;
  startDate: string | null;
  endDate: string | null;
  brand: {
    name: string;
    logo: string | null;
    website: string | null;
    industry: string | null;
  };
  rewardTiers: RewardTier[];
  participantCount: number;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const PLATFORM_META: Record<string, { emoji: string; label: string; color: string }> = {
  reddit: { emoji: '🔴', label: 'Reddit', color: '#FF4500' },
  linkedin: { emoji: '🔵', label: 'LinkedIn', color: '#0077B5' },
  instagram: { emoji: '📸', label: 'Instagram', color: '#E4405F' },
  review: { emoji: '⭐', label: 'Reviews', color: '#FFD700' },
};

export default function CampaignPublicPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<CampaignPublicData | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_BASE}/campaigns/${id}/public`)
      .then(res => {
        if (!res.ok) throw new Error('Campaign not found');
        return res.json();
      })
      .then(json => {
        if (json?.data) setCampaign(json.data);
        else setError('Campaign not found or no longer active.');
      })
      .catch(() => setError('Campaign not found or no longer active.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleParticipate = () => {
    if (!id) return;
    if (user) {
      // Logged in → go to submit page or campaign detail
      if (user.role === 'advocate') {
        navigate(`/advocate/submit/${id}`);
      } else {
        navigate(`/advocate/campaigns/${id}`);
      }
    } else {
      // Not logged in → signup with redirect back to this campaign
      navigate(`/auth/signup?redirect=/campaign/${id}`);
    }
  };

  const handleLogin = () => {
    navigate(`/auth/login?redirect=/campaign/${id}`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Loading ─────────────────────── */
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0A0A14 0%, #0F0F1A 50%, #141428 100%)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader size={32} style={{ animation: 'spin 1.5s linear infinite', color: '#A78BFA', marginBottom: 16 }} />
          <p style={{ color: '#A0A0B0', fontSize: '0.85rem' }}>Loading campaign details...</p>
        </div>
      </div>
    );
  }

  /* ── Error ────────────────────────── */
  if (error || !campaign) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0A0A14 0%, #0F0F1A 50%, #141428 100%)',
        color: '#E0E0E0',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: '0 1rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 1.5rem',
            background: 'rgba(225,112,85,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Target size={28} color="#E17055" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Campaign Not Found</h2>
          <p style={{ color: '#A0A0B0', lineHeight: 1.6 }}>{error || 'This campaign may have ended or is no longer active.'}</p>
          <button onClick={() => navigate('/')} style={{
            marginTop: '1.5rem', padding: '12px 28px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #A78BFA, #6C5CE7)', color: '#fff', fontWeight: 700, fontSize: '0.85rem',
          }}>
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  const maxDiscount = campaign.rewardTiers.length > 0
    ? Math.max(...campaign.rewardTiers.map(t => t.discountPercent))
    : 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0A0A14 0%, #0F0F1A 50%, #141428 100%)',
      color: '#E0E0E0',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* ── Accent top bar ─────────────────── */}
      <div style={{
        height: 3,
        background: 'linear-gradient(90deg, #A78BFA, #6C5CE7, #00B894, #00D2D3)',
      }} />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '2.5rem 1.5rem 3rem' }}>

        {/* ── Brand Badge ─────────────────── */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem',
          padding: '10px 18px', borderRadius: 50,
          background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)',
        }}>
          {campaign.brand.logo ? (
            <img src={campaign.brand.logo} alt={campaign.brand.name} style={{
              width: 22, height: 22, borderRadius: '50%', objectFit: 'cover',
            }} />
          ) : (
            <Sparkles size={14} color="#A78BFA" />
          )}
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#A78BFA' }}>
            {campaign.brand.name} × Word of Wow
          </span>
          {campaign.brand.industry && (
            <span style={{
              fontSize: '0.65rem', color: '#666', padding: '2px 8px', borderRadius: 99,
              background: 'rgba(255,255,255,0.04)',
            }}>
              {campaign.brand.industry}
            </span>
          )}
        </div>

        {/* ── Title ──────────────────────── */}
        <h1 style={{
          fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', fontWeight: 800,
          letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: '0.75rem',
        }}>
          {campaign.title}
        </h1>

        {/* ── Description ───────────────── */}
        <p style={{
          fontSize: '1.05rem', color: '#A0A0B0', lineHeight: 1.7,
          maxWidth: 600, marginBottom: '1.5rem',
        }}>
          {campaign.description}
        </p>

        {/* ── Social Proof ──────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem',
          flexWrap: 'wrap',
        }}>
          {campaign.participantCount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              background: 'rgba(0,184,148,0.06)', border: '1px solid rgba(0,184,148,0.12)',
            }}>
              <Users size={14} color="#00B894" />
              <span style={{ fontSize: '0.78rem', color: '#00B894', fontWeight: 600 }}>
                {campaign.participantCount.toLocaleString()} participant{campaign.participantCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {maxDiscount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              background: 'rgba(253,203,110,0.06)', border: '1px solid rgba(253,203,110,0.15)',
            }}>
              <Gift size={14} color="#FDCB6E" />
              <span style={{ fontSize: '0.78rem', color: '#FDCB6E', fontWeight: 600 }}>
                Up to {maxDiscount}% discount rewards
              </span>
            </div>
          )}
          {campaign.endDate && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <Zap size={14} color="#A0A0B0" />
              <span style={{ fontSize: '0.78rem', color: '#A0A0B0', fontWeight: 600 }}>
                Ends {new Date(campaign.endDate).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* ── CTA Section ───────────────── */}
        <div style={{
          background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.12)',
          borderRadius: 20, padding: '2rem', marginBottom: '2rem',
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>
            {user ? 'Ready to Participate?' : 'Join This Campaign'}
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#A0A0B0', marginBottom: '1.5rem', maxWidth: 450, margin: '0 auto 1.5rem' }}>
            {user
              ? 'Share your honest experience and earn exciting rewards!'
              : 'Create a free account to share your experience and earn exclusive discounts and rewards.'
            }
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={handleParticipate} style={{
              padding: '14px 32px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #A78BFA, #6C5CE7)', color: '#fff',
              fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(167,139,250,0.35)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(167,139,250,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(167,139,250,0.35)'; }}
            >
              {user ? 'Submit Your Post' : 'Sign Up & Participate'}
              <ArrowRight size={18} />
            </button>
            {!user && (
              <button onClick={handleLogin} style={{
                padding: '14px 28px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer', background: 'rgba(255,255,255,0.04)', color: '#C0C0D0',
                fontWeight: 600, fontSize: '0.88rem',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              >
                Already have an account? Log In
              </button>
            )}
          </div>
        </div>

        {/* ── Platforms ─────────────────── */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, padding: '1.5rem', marginBottom: '1.25rem',
        }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={16} color="#A78BFA" /> Where to Post
          </h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {campaign.platforms.map(p => {
              const meta = PLATFORM_META[p] || { emoji: '🌐', label: p, color: '#A0A0B0' };
              return (
                <div key={p} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: 12,
                  background: `${meta.color}12`, border: `1px solid ${meta.color}25`,
                }}>
                  <span style={{ fontSize: '1.1rem' }}>{meta.emoji}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: meta.color }}>{meta.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Reward Tiers ──────────────── */}
        {campaign.rewardTiers.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16, padding: '1.5rem', marginBottom: '1.25rem',
          }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={16} color="#FFD700" /> Reward Tiers
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#A0A0B0', marginBottom: '1rem', lineHeight: 1.5 }}>
              Our AI scores your post based on quality, relevance, and authenticity. The higher your score, the bigger your reward!
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
              {campaign.rewardTiers.map((tier, i) => {
                const colors = ['#E17055', '#FDCB6E', '#00B894', '#00FF7F'];
                const color = colors[Math.min(i, colors.length - 1)];
                return (
                  <div key={i} style={{
                    padding: '1rem', borderRadius: 14, textAlign: 'center',
                    background: `${color}08`, border: `1px solid ${color}20`,
                  }}>
                    <div style={{
                      fontSize: '1.6rem', fontWeight: 800, color, marginBottom: 4,
                      textShadow: `0 0 16px ${color}30`,
                    }}>
                      {tier.discountPercent}%
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#A0A0B0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      OFF
                    </div>
                    <div style={{
                      marginTop: 8, fontSize: '0.7rem', color: '#666',
                      padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.03)',
                    }}>
                      Score {tier.minScore}–{tier.maxScore}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Guidelines ────────────────── */}
        {campaign.guidelines && (
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16, padding: '1.5rem', marginBottom: '1.25rem',
          }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={16} color="#00D2D3" /> Campaign Guidelines
            </h3>
            <div style={{
              fontSize: '0.88rem', color: '#C0C0D0', lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}>
              {campaign.guidelines}
            </div>
          </div>
        )}

        {/* ── Keywords ──────────────────── */}
        {campaign.keywords && campaign.keywords.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16, padding: '1.5rem', marginBottom: '1.25rem',
          }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={16} color="#E17055" /> Mentions to Include
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {campaign.keywords.map((kw, i) => (
                <span key={i} style={{
                  padding: '5px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 600,
                  background: 'rgba(108,92,231,0.1)', color: '#A29BFE',
                  border: '1px solid rgba(108,92,231,0.15)',
                }}>
                  #{kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── How It Works ──────────────── */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, padding: '1.5rem', marginBottom: '2rem',
        }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} color="#FDCB6E" /> How It Works
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { step: '1', icon: <Users size={16} />, title: 'Sign Up', desc: 'Create your free Word of Wow account' },
              { step: '2', icon: <MessageSquare size={16} />, title: 'Share Your Experience', desc: `Post about ${campaign.brand.name} on ${campaign.platforms.map(p => PLATFORM_META[p]?.label || p).join(', ')}` },
              { step: '3', icon: <Shield size={16} />, title: 'AI Scores Your Post', desc: 'Our AI evaluates quality, relevance, and authenticity' },
              { step: '4', icon: <Gift size={16} />, title: 'Earn Rewards', desc: `Get up to ${maxDiscount}% discount based on your score` },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '12px 16px', borderRadius: 12,
                background: 'rgba(255,255,255,0.02)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(108,92,231,0.1))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#A78BFA', fontWeight: 800, fontSize: '0.82rem',
                }}>
                  {item.step}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 2 }}>{item.title}</p>
                  <p style={{ fontSize: '0.78rem', color: '#A0A0B0', lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Share this campaign ────────── */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 10, marginBottom: '2rem',
        }}>
          <button onClick={handleCopyLink} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
            borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
            background: copied ? 'rgba(0,184,148,0.08)' : 'rgba(255,255,255,0.03)',
            color: copied ? '#00B894' : '#A0A0B0', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
            transition: 'all 0.2s',
          }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Link Copied!' : 'Copy Campaign Link'}
          </button>
        </div>

        {/* ── Bottom CTA ────────────────── */}
        {!user && (
          <div style={{
            textAlign: 'center', padding: '2rem',
            background: 'linear-gradient(135deg, rgba(167,139,250,0.06), rgba(0,184,148,0.04))',
            borderRadius: 20, border: '1px solid rgba(167,139,250,0.12)',
          }}>
            <Star size={28} color="#FFD700" style={{ marginBottom: 12 }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 8 }}>
              Don't Miss Out on Rewards!
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#A0A0B0', marginBottom: '1.25rem', maxWidth: 400, margin: '0 auto 1.25rem' }}>
              Join now and start earning discounts by sharing your genuine experience.
            </p>
            <button onClick={handleParticipate} style={{
              padding: '14px 36px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #A78BFA, #6C5CE7)', color: '#fff',
              fontWeight: 700, fontSize: '0.92rem', display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(167,139,250,0.35)',
            }}>
              Sign Up Now <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ── Footer ────────────────────── */}
        <div style={{
          textAlign: 'center', marginTop: '3rem', paddingTop: '2rem',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
          <p style={{ fontSize: '0.72rem', color: '#666' }}>
            Powered by <strong style={{ color: '#A78BFA' }}>Word of Wow</strong> — 
            Turn your customers into brand advocates
          </p>
        </div>
      </div>

      {/* Spin animation */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
