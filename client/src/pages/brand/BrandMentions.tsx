import { useState } from 'react';
import api from '../../lib/api';
import { Card } from '../../components/shared/Card';
import { StatCard } from '../../components/shared/StatCard';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import {
  Search, Globe, TrendingUp, TrendingDown, Minus, BarChart3,
  ExternalLink, ArrowUp, MessageCircle, Loader, Radar, AlertTriangle,
  Lightbulb, ShieldAlert, Swords, ChevronDown, ChevronUp, Filter,
  Heart, Sparkles, Target, Zap, Eye, Gauge,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */
interface MentionItem {
  title: string; link: string; platform: string; sentiment: string;
  snippet: string; upvotes?: number | null; num_comments?: number | null;
  subreddit?: string | null; date?: string | null; relevance_score?: number;
  estimated_reach?: number;
}

interface BreakdownEntry { count: number; percentage: number }
interface PlatformBreakdown { [key: string]: BreakdownEntry }
interface SentimentBreakdown { [key: string]: BreakdownEntry }
interface SentimentByPlatform { [key: string]: { Positive: number; Negative: number; Neutral: number } }

interface NegativeSource { title: string; link: string; platform: string; snippet: string }

interface WowInsights { likes: string[]; complaints: string[]; suggestions: string[] }

interface WowScoreBreakdown { reach: number; mentions: number; sentiment: number; authority: number; sentimentByViews?: number }

interface TrackingResult {
  brand_name: string; tracked_at: string; total_mentions: number;
  platform_breakdown: PlatformBreakdown; sentiment_breakdown: SentimentBreakdown;
  sentiment_by_platform: SentimentByPlatform; wow_insights?: WowInsights;
  negative_sources?: NegativeSource[];
  positive_sources?: NegativeSource[];
  top_mentions: MentionItem[]; all_mentions: MentionItem[];
  estimated_reach?: number;
  wow_score?: number;
  wow_score_breakdown?: WowScoreBreakdown;
}

/* ═══════════════════════════════════════════════════════
   Design Tokens
   ═══════════════════════════════════════════════════════ */
const S = {
  Positive: '#00B894', Negative: '#E17055', Neutral: '#6C5CE7',
};
const PLAT_COLORS = [
  '#6C5CE7','#00D2D3','#E17055','#FDCB6E','#00B894',
  '#E84393','#A29BFE','#FD79A8','#55EFC4','#81ECEC','#FAB1A0','#74B9FF','#FF7675',
];

/* ═══════════════════════════════════════════════════════
   Micro-components
   ═══════════════════════════════════════════════════════ */
const Badge = ({ children, bg, fg, border }: { children: React.ReactNode; bg: string; fg: string; border?: string }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px',
    borderRadius: 999, fontSize: '0.68rem', fontWeight: 600,
    background: bg, color: fg, border: border || 'none',
    letterSpacing: '0.02em',
  }}>{children}</span>
);

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const c = S[sentiment as keyof typeof S] || '#A0A0B0';
  const I = sentiment === 'Positive' ? TrendingUp : sentiment === 'Negative' ? TrendingDown : Minus;
  return <Badge bg={`${c}18`} fg={c} border={`1px solid ${c}30`}><I size={11} />{sentiment}</Badge>;
}

function PlatformBadge({ platform }: { platform: string }) {
  return <Badge bg="rgba(108,92,231,0.12)" fg="#A29BFE" border="1px solid rgba(108,92,231,0.2)"><Globe size={10} />{platform}</Badge>;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(15,15,26,0.95)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10, padding: '8px 12px', color: '#fff', fontSize: '0.78rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {label && <p style={{ fontWeight: 600, marginBottom: 4, fontSize: '0.7rem', opacity: 0.7 }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill, fontSize: '0.78rem', fontWeight: 500 }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

/* Glassmorphism section wrapper */
const Section = ({ children, style, glow }: { children: React.ReactNode; style?: React.CSSProperties; glow?: string }) => (
  <div style={{
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16, padding: '1.5rem',
    backdropFilter: 'blur(20px)',
    boxShadow: glow
      ? `0 0 40px ${glow}, 0 8px 32px rgba(0,0,0,0.2)`
      : '0 4px 24px rgba(0,0,0,0.15)',
    marginBottom: 'var(--space-xl)',
    ...style,
  }}>
    {children}
  </div>
);

/* ═══════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════ */
export default function BrandMentions() {
  const [brandName, setBrandName] = useState('');
  const [brandUrl, setBrandUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [activeTab, setActiveTab] = useState<'top' | 'all'>('top');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'Positive' | 'Negative' | 'Neutral'>('all');

  const [competitorName, setCompetitorName] = useState('');
  const [competitorLoading, setCompetitorLoading] = useState(false);
  const [competitorResult, setCompetitorResult] = useState<TrackingResult | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  // Advanced filters
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [minViews, setMinViews] = useState<number>(0);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortBy, setSortBy] = useState<'date' | 'views'>('date');

  /* ── API calls ─────────────────────── */
  const handleTrack = async () => {
    if (!brandName.trim()) return;
    setLoading(true); setError(''); setResult(null); setCompetitorResult(null);
    try {
      const res = await api.post('/brand-mentions/track', {
        brand_name: brandName.trim(), brand_url: brandUrl.trim() || undefined,
      }, { timeout: 330000 });
      if (res.data?.success && res.data?.data) setResult(res.data.data);
      else setError('Unexpected response format.');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to track mentions');
    } finally { setLoading(false); }
  };

  const handleCompetitorTrack = async () => {
    if (!competitorName.trim()) return;
    setCompetitorLoading(true);
    try {
      const res = await api.post('/brand-mentions/track', {
        brand_name: competitorName.trim(),
      }, { timeout: 330000 });
      if (res.data?.success && res.data?.data) setCompetitorResult(res.data.data);
    } catch {} finally { setCompetitorLoading(false); }
  };

  /* ── Derived data ──────────────────── */
  const sentimentPieData = result
    ? Object.entries(result.sentiment_breakdown).map(([name, d]) => ({ name, value: d.count }))
    : [];
  const platformBarData = result
    ? Object.entries(result.platform_breakdown).sort((a, b) => b[1].count - a[1].count)
        .map(([name, d]) => ({ name, count: d.count, percentage: d.percentage }))
    : [];
  const sentimentByPlatformData = result
    ? Object.entries(result.sentiment_by_platform).map(([platform, s]) => ({
        platform, Positive: s.Positive || 0, Negative: s.Negative || 0, Neutral: s.Neutral || 0,
      }))
    : [];
  const positivePercent = result?.sentiment_breakdown?.Positive?.percentage ?? 0;
  const negativePercent = result?.sentiment_breakdown?.Negative?.percentage ?? 0;
  const platformCount = result ? Object.keys(result.platform_breakdown).length : 0;
  const formatReach = (n: number) => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);

  const availablePlatforms = result ? Object.keys(result.platform_breakdown) : [];

  const filteredMentions = (result?.all_mentions || [])
    .filter(m => sentimentFilter === 'all' ? true : m.sentiment === sentimentFilter)
    .filter(m => platformFilter === 'all' ? true : m.platform?.toLowerCase() === platformFilter.toLowerCase())
    .filter(m => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (m.title || '').toLowerCase().includes(q) || (m.snippet || '').toLowerCase().includes(q);
    })
    .filter(m => minViews <= 0 ? true : (m.estimated_reach || 0) >= minViews)
    .sort((a, b) => {
      if (sortBy === 'views') {
        return sortOrder === 'desc'
          ? (b.estimated_reach || 0) - (a.estimated_reach || 0)
          : (a.estimated_reach || 0) - (b.estimated_reach || 0);
      }
      const aDate = a.date ? new Date(a.date).getTime() : 0;
      const bDate = b.date ? new Date(b.date).getTime() : 0;
      return sortOrder === 'desc' ? bDate - aDate : aDate - bDate;
    });

  const comparisonData = (result && competitorResult) ? [
    { metric: 'Total Mentions', brand: result.total_mentions, competitor: competitorResult.total_mentions },
    { metric: 'Positive %', brand: result.sentiment_breakdown?.Positive?.percentage ?? 0, competitor: competitorResult.sentiment_breakdown?.Positive?.percentage ?? 0 },
    { metric: 'Negative %', brand: result.sentiment_breakdown?.Negative?.percentage ?? 0, competitor: competitorResult.sentiment_breakdown?.Negative?.percentage ?? 0 },
    { metric: 'Platforms', brand: Object.keys(result.platform_breakdown).length, competitor: Object.keys(competitorResult.platform_breakdown).length },
  ] : [];

  /* ═══════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="animate-fade-in">

      {/* ── Hero Header ──────────────────── */}
      <div style={{
        marginBottom: 'var(--space-xl)', position: 'relative',
        padding: '2rem 0 1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <img src="/favicon.png" alt="WOW" style={{
            width: 50, height: 50, borderRadius: 12, objectFit: 'contain',
            boxShadow: '0 4px 20px rgba(108,92,231,0.3)',
          }} />
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
              Brand Mentions Tracker
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0, marginTop: 2 }}>
              AI-powered brand intelligence across the web
            </p>
          </div>
        </div>
      </div>

      {/* ── Search Card ──────────────────── */}
      <Section glow="rgba(108,92,231,0.06)">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '2', minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Brand Name *
            </label>
            <input
              id="brand-name-input" className="input" type="text"
              placeholder="e.g. Tesla, Notion, Stripe..."
              value={brandName} onChange={(e) => setBrandName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleTrack()}
              disabled={loading}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.9rem' }}
            />
          </div>
          <div style={{ flex: '2', minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Website URL <span style={{ opacity: 0.5, fontWeight: 400 }}>(helps filter irrelevant results)</span>
            </label>
            <input
              id="brand-url-input" className="input" type="url"
              placeholder="https://yourbrand.com"
              value={brandUrl} onChange={(e) => setBrandUrl(e.target.value)}
              disabled={loading}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.9rem' }}
            />
          </div>
          <button
            id="track-mentions-btn" className="btn btn-primary btn-lg"
            onClick={handleTrack} disabled={loading || !brandName.trim()}
            style={{
              minWidth: 180, height: 48, fontSize: '0.85rem', fontWeight: 600,
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              boxShadow: '0 4px 20px rgba(108,92,231,0.25)',
              border: 'none', letterSpacing: '0.02em',
            }}
          >
            {loading
              ? <><Loader size={18} style={{ animation: 'spin 1.5s linear infinite' }} />Tracking...</>
              : <><Search size={18} />Track Mentions</>}
          </button>
        </div>
      </Section>

      {/* ── Loading ──────────────────────── */}
      {loading && (
        <Section glow="rgba(108,92,231,0.08)" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 1.5rem',
            background: 'linear-gradient(135deg, rgba(108,92,231,0.15), rgba(0,210,211,0.1))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Radar size={32} color="var(--color-primary)" style={{ animation: 'spin 3s linear infinite' }} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 6, letterSpacing: '-0.01em' }}>
            Scanning the web for <span className="gradient-text">"{brandName}"</span>
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Crawling Google, Reddit, LinkedIn, Twitter, Trustpilot & more.
            AI is analyzing relevance and sentiment. This typically takes 2–4 minutes.
          </p>
          <div style={{
            marginTop: '2rem', height: 3, background: 'rgba(255,255,255,0.04)',
            borderRadius: 2, overflow: 'hidden', maxWidth: 380, margin: '2rem auto 0',
          }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary), var(--color-primary))',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s ease-in-out infinite', width: '100%',
            }} />
          </div>
        </Section>
      )}

      {/* ── Error ────────────────────────── */}
      {error && !loading && (
        <Section style={{
          background: 'rgba(225,112,85,0.05)', border: '1px solid rgba(225,112,85,0.15)',
          display: 'flex', alignItems: 'center', gap: '1rem',
        }}>
          <AlertTriangle size={22} color="#E17055" />
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Tracking Failed</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>{error}</p>
          </div>
        </Section>
      )}

      {/* ══════════════════════════════════════════════
         RESULTS DASHBOARD
         ══════════════════════════════════════════════ */}
      {result && !loading && (
        <>
          {/* ── Header bar ─────────────────── */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 8,
          }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Results for <span className="gradient-text">"{result.brand_name}"</span>
            </h2>
            <span style={{
              fontSize: '0.7rem', color: 'var(--color-text-muted)',
              background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: 6,
            }}>
              {new Date(result.tracked_at).toLocaleString()}
            </span>
          </div>

          {/* ══════════════════════════════════════════
             WOW SCORE — Speedometer Gauge
             ══════════════════════════════════════════ */}
          {(() => {
            const score = result.wow_score ?? 0;
            const breakdown = result.wow_score_breakdown;
            const getScoreLabel = (s: number) => {
              if (s >= 95) return { label: 'Legendary 🔥', color: '#00FF7F' };
              if (s >= 90) return { label: 'Legendary', color: '#FFD700' };
              if (s >= 80) return { label: 'Excellent', color: '#00B894' };
              if (s >= 60) return { label: 'Strong', color: '#55EFC4' };
              if (s >= 30) return { label: 'Growing', color: '#FDCB6E' };
              return { label: 'Needs Work', color: '#E17055' };
            };
            const { label: scoreLabel, color: scoreColor } = getScoreLabel(score);

            // SVG arc math
            const cx = 170, cy = 155, r = 110;
            const startAngle = -210, endAngle = 30; // 240° sweep
            const sweep = endAngle - startAngle;
            const needleAngle = startAngle + (score / 100) * sweep;
            const needleRad = (needleAngle * Math.PI) / 180;
            const needleX = cx + (r - 15) * Math.cos(needleRad);
            const needleY = cy + (r - 15) * Math.sin(needleRad);

            const arcPath = (startDeg: number, endDeg: number, radius: number) => {
              const s = (startDeg * Math.PI) / 180;
              const e = (endDeg * Math.PI) / 180;
              const x1 = cx + radius * Math.cos(s);
              const y1 = cy + radius * Math.sin(s);
              const x2 = cx + radius * Math.cos(e);
              const y2 = cy + radius * Math.sin(e);
              const large = endDeg - startDeg > 180 ? 1 : 0;
              return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
            };

            // Breakdown bar helper
            const BreakdownBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.75rem' }}>
                <span style={{ width: 70, color: 'var(--color-text-muted)', textAlign: 'right', flexShrink: 0 }}>{label}</span>
                <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${value}%`, background: color,
                    transition: 'width 1.5s cubic-bezier(0.22,1,0.36,1)',
                  }} />
                </div>
                <span style={{ width: 30, fontWeight: 600, color }}>{value}</span>
              </div>
            );

            return (
              <Section glow={`${scoreColor}15`} style={{ marginBottom: 'var(--space-xl)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '2rem' }}>
                  {/* Gauge */}
                  <div style={{ textAlign: 'center' }}>
                    <svg width="340" height="200" viewBox="0 0 340 200" style={{ overflow: 'visible' }}>
                      {/* Outer glow ring */}
                      <path d={arcPath(startAngle, endAngle, r + 8)}
                        fill="none" stroke={`${scoreColor}10`} strokeWidth="6" strokeLinecap="round" />
                      {/* Background arc  */}
                      <path d={arcPath(startAngle, endAngle, r)}
                        fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="22" strokeLinecap="butt" />
                      {/* Score bands — NO round caps to avoid dots at joins */}
                      <path d={arcPath(startAngle, startAngle + sweep * 0.3, r)}
                        fill="none" stroke="rgba(225,112,85,0.18)" strokeWidth="22" strokeLinecap="butt" />
                      <path d={arcPath(startAngle + sweep * 0.3, startAngle + sweep * 0.6, r)}
                        fill="none" stroke="rgba(253,203,110,0.18)" strokeWidth="22" strokeLinecap="butt" />
                      <path d={arcPath(startAngle + sweep * 0.6, startAngle + sweep * 0.8, r)}
                        fill="none" stroke="rgba(85,239,196,0.18)" strokeWidth="22" strokeLinecap="butt" />
                      <path d={arcPath(startAngle + sweep * 0.8, startAngle + sweep * 0.9, r)}
                        fill="none" stroke="rgba(0,184,148,0.18)" strokeWidth="22" strokeLinecap="butt" />
                      <path d={arcPath(startAngle + sweep * 0.9, endAngle, r)}
                        fill="none" stroke="rgba(0,255,127,0.22)" strokeWidth="22" strokeLinecap="butt" />
                      {/* Active arc (filled to score) */}
                      <path d={arcPath(startAngle, startAngle + (score / 100) * sweep, r)}
                        fill="none" stroke={scoreColor} strokeWidth="22" strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 12px ${scoreColor}70)` }} />
                      {/* Inner glow arc */}
                      <path d={arcPath(startAngle, startAngle + (score / 100) * sweep, r - 14)}
                        fill="none" stroke={`${scoreColor}15`} strokeWidth="6" strokeLinecap="round" />
                      {/* Needle */}
                      <line x1={cx} y1={cy} x2={needleX} y2={needleY}
                        stroke="#fff" strokeWidth="3" strokeLinecap="round"
                        style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.6))' }} />
                      <circle cx={cx} cy={cy} r="7" fill="#fff" style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.4))' }} />
                      <circle cx={cx} cy={cy} r="3" fill={scoreColor} />
                      {/* Score text inside gauge */}
                      <text x={cx} y={cy - 20} textAnchor="middle" fill={scoreColor}
                        style={{ fontSize: '3.2rem', fontWeight: 800 }}>{score}</text>
                    </svg>
                    {/* WOW SCORE label OUTSIDE the speedometer */}
                    <div style={{
                      marginTop: -4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    }}>
                      <span style={{
                        fontSize: '0.78rem', fontWeight: 800, color: scoreColor,
                        textTransform: 'uppercase', letterSpacing: '0.18em',
                        textShadow: `0 0 16px ${scoreColor}50`,
                      }}>WOW SCORE</span>
                      <p style={{ color: scoreColor, fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>{scoreLabel}</p>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', maxWidth: 280, opacity: 0.7, margin: 0 }}>
                        How strong is your brand's organic word-of-mouth presence on the internet
                      </p>
                    </div>
                  </div>

                  {/* Breakdown */}
                  {breakdown && (
                    <div style={{ flex: 1, minWidth: 220, maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                        Score Breakdown
                      </h4>
                      <BreakdownBar label="Reach" value={breakdown.reach} color="#6C5CE7" />
                      <BreakdownBar label="Mentions" value={breakdown.mentions} color="#00D2D3" />
                      <BreakdownBar label="Sentiment" value={breakdown.sentiment} color="#00B894" />
                      <BreakdownBar label="Authority" value={breakdown.authority} color="#FDCB6E" />
                      <BreakdownBar
                        label="Views Sentiment"
                        value={breakdown.sentimentByViews ?? 50}
                        color={
                          (breakdown.sentimentByViews ?? 50) < 10 ? '#EF4444' :
                          (breakdown.sentimentByViews ?? 50) < 30 ? '#F59E0B' :
                          '#00B894'
                        }
                      />
                      <div style={{
                        marginTop: 12, padding: '10px 14px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                        fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: 1.6,
                      }}>
                        <strong style={{ color: '#00FF7F' }}>95+</strong> Legendary · <strong style={{ color: '#FFD700' }}>90+</strong> Legendary · <strong style={{ color: '#00B894' }}>80+</strong> Excellent · <strong style={{ color: '#55EFC4' }}>60+</strong> Strong · <strong style={{ color: '#FDCB6E' }}>30+</strong> Growing · <strong style={{ color: '#E17055' }}>&lt;30</strong> Needs Improvement
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            );
          })()}

          {/* ── Stat Cards ───────────────── */}
          <div className="stats-grid" style={{ marginBottom: 'var(--space-sm)' }}>
            <StatCard label="Mentions" value={result.total_mentions}
              icon={<BarChart3 size={20} />} accentColor="var(--color-primary)" />
            <StatCard label="Est. Views" value={formatReach(result.estimated_reach || 0)}
              icon={<Eye size={20} />} accentColor="var(--color-warning)"
              subtitle="Estimated total views across all platforms including organic shares and impressions" />
            <StatCard label="Positive" value={`${positivePercent}%`}
              icon={<TrendingUp size={20} />} accentColor="var(--color-success)" />
            <StatCard label="Negative" value={`${negativePercent}%`}
              icon={<TrendingDown size={20} />} accentColor="var(--color-danger)" />
            <StatCard label="Platforms Found" value={platformCount}
              icon={<Globe size={20} />} accentColor="var(--color-secondary)" />
          </div>
          <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', opacity: 0.6, textAlign: 'center', marginBottom: 'var(--space-xl)', lineHeight: 1.5 }}>
            Showing the most influential mentions driving the highest impact and visibility for your brand.
          </p>

          {/* ── Charts Row 1: Sentiment Distribution + Est. Views by Sentiment ───────────────── */}
          <div className="content-grid" style={{ marginBottom: 'var(--space-xl)' }}>
            <Section style={{ marginBottom: 0 }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.25rem', letterSpacing: '-0.01em' }}>
                Sentiment Distribution
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={sentimentPieData} cx="50%" cy="50%" innerRadius={58} outerRadius={88}
                    dataKey="value" strokeWidth={2} stroke="#0F0F1A"
                    label={({ name, percent }) => {
                      const short = name === 'Negative' ? 'Neg' : name === 'Positive' ? 'Pos' : 'Neu';
                      return `${short} ${((percent ?? 0) * 100).toFixed(0)}%`;
                    }}
                  >
                    {sentimentPieData.map((e) => <Cell key={e.name} fill={S[e.name as keyof typeof S] || '#A0A0B0'} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: 8 }}>
                {sentimentPieData.map((e) => (
                  <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: S[e.name as keyof typeof S] || '#A0A0B0' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>{e.name} ({e.value})</span>
                  </div>
                ))}
              </div>
            </Section>

            {/* Est. Views by Sentiment (swapped here from row 2) */}
            <Section style={{ marginBottom: 0 }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.25rem' }}>Est. Views by Sentiment</h3>
              {(() => {
                const positiveViews = (result.all_mentions || []).filter(m => m.sentiment === 'Positive').reduce((s, m) => s + (m.estimated_reach || 0), 0);
                const negativeViews = (result.all_mentions || []).filter(m => m.sentiment === 'Negative').reduce((s, m) => s + (m.estimated_reach || 0), 0);
                const neutralViews = (result.all_mentions || []).filter(m => m.sentiment === 'Neutral').reduce((s, m) => s + (m.estimated_reach || 0), 0);
                const viewsData = [
                  { name: 'Positive', views: positiveViews },
                  { name: 'Neutral', views: neutralViews },
                  { name: 'Negative', views: negativeViews },
                ];
                const totalSentViews = positiveViews + negativeViews;
                const negExceedsPos = negativeViews > positiveViews;
                const negRatio = totalSentViews > 0 ? negativeViews / totalSentViews : 0;

                // Generate insight line
                let insightText = '';
                let insightColor = 'var(--color-text-muted)';
                if (negExceedsPos) {
                  insightText = `⚠️ Negative content is outpacing positive by ${formatReach(negativeViews - positiveViews)} views. This needs urgent attention.`;
                  insightColor = '#EF4444';
                } else if (negRatio > 0.35) {
                  insightText = `Negative sentiment accounts for ${Math.round(negRatio * 100)}% of views. Monitor closely for reputation risks.`;
                  insightColor = '#F59E0B';
                } else if (positiveViews > 0 && negativeViews === 0) {
                  insightText = `All visible reach is positive or neutral. Strong brand perception online.`;
                  insightColor = '#10B981';
                } else if (positiveViews > negativeViews * 3) {
                  insightText = `Positive content has ${Math.round(positiveViews / Math.max(negativeViews, 1))}x more visibility than negative. Healthy sentiment distribution.`;
                  insightColor = '#10B981';
                } else {
                  insightText = `Mixed sentiment visibility. Positive leads by ${formatReach(positiveViews - negativeViews)} views, but gaps exist.`;
                  insightColor = '#A0A0B0';
                }

                return (
                  <>
                    {/* Flag: Negative views exceed positive */}
                    {negExceedsPos && (
                      <div style={{
                        padding: '0.6rem 0.8rem', borderRadius: 10, marginBottom: '1rem',
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <span style={{ fontSize: '1rem' }}>🚨</span>
                        <p style={{ fontSize: '0.72rem', color: '#EF4444', fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
                          Negative content has more estimated views than positive content. 
                          This suggests high-visibility complaints or criticism are reaching more people than your positive mentions.
                        </p>
                      </div>
                    )}
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={viewsData} margin={{ left: 10, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" tick={{ fill: '#A0A0B0', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#A0A0B0', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="views" radius={[6, 6, 0, 0]}>
                          {viewsData.map((e) => <Cell key={e.name} fill={S[e.name as keyof typeof S] || '#A0A0B0'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: 8 }}>
                      {viewsData.map(e => (
                        <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: S[e.name as keyof typeof S] || '#A0A0B0' }} />
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>{e.name}: {formatReach(e.views)}</span>
                        </div>
                      ))}
                    </div>
                    {/* Insight line */}
                    <p style={{
                      fontSize: '0.7rem', color: insightColor, fontWeight: 500,
                      marginTop: '0.75rem', textAlign: 'center', lineHeight: 1.5, fontStyle: 'italic',
                    }}>
                      {insightText}
                    </p>
                  </>
                );
              })()}
            </Section>
          </div>

          {/* ── Charts Row 2: Sentiment by Platform + Platform Distribution ─────── */}
          {sentimentByPlatformData.length > 0 && (
            <div className="content-grid" style={{ marginBottom: 'var(--space-xl)' }}>
              <Section style={{ marginBottom: 0 }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.25rem' }}>Sentiment by Platform</h3>
                <ResponsiveContainer width="100%" height={Math.max(220, sentimentByPlatformData.length * 38)}>
                  <BarChart data={sentimentByPlatformData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" tick={{ fill: '#A0A0B0', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="platform" type="category" width={105}
                      tick={{ fill: '#A0A0B0', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                    <Bar dataKey="Positive" stackId="a" fill={S.Positive} />
                    <Bar dataKey="Neutral" stackId="a" fill={S.Neutral} />
                    <Bar dataKey="Negative" stackId="a" fill={S.Negative} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>

              {/* Platform Distribution (swapped here from row 1) */}
              <Section style={{ marginBottom: 0 }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.25rem', letterSpacing: '-0.01em' }}>
                  Platform Distribution
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={platformBarData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" tick={{ fill: '#A0A0B0', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={95}
                      tick={{ fill: '#A0A0B0', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {platformBarData.map((_, i) => <Cell key={i} fill={PLAT_COLORS[i % PLAT_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            </div>
          )}

          {/* ══════════════════════════════════════════
             WOW INSIGHTS – Creative Layout
             ══════════════════════════════════════════ */}
          {result.wow_insights && (
            <div style={{
              marginBottom: 'var(--space-xl)', borderRadius: 20, overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(108,92,231,0.06) 0%, rgba(0,210,211,0.04) 50%, rgba(225,112,85,0.04) 100%)',
              border: '1px solid rgba(108,92,231,0.15)',
              position: 'relative',
            }}>
              {/* Top accent bar */}
              <div style={{
                height: 2,
                background: 'linear-gradient(90deg, #6C5CE7, #00D2D3, #00B894, #E17055)',
              }} />

              <div style={{ padding: '2rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(108,92,231,0.3)',
                  }}>
                    <Sparkles size={20} color="#fff" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                      WOW Insights
                    </h3>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: 0, marginTop: 1 }}>
                      AI-distilled brand perception from {result.total_mentions} mentions
                    </p>
                  </div>
                </div>

                {/* ── Three columns layout ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>

                  {/* LIKES */}
                  <div style={{
                    borderRadius: 14, padding: '1.25rem',
                    background: 'rgba(0,184,148,0.04)',
                    border: '1px solid rgba(0,184,148,0.12)',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, width: 3, height: '100%',
                      background: 'linear-gradient(180deg, #00B894, #55EFC4)',
                      borderRadius: '0 2px 2px 0',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1rem', paddingLeft: 8 }}>
                      <Heart size={15} color="#00B894" />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00B894', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        What Customers Love
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 8 }}>
                      {(result.wow_insights.likes || []).map((item, i) => (
                        <div key={i} style={{
                          display: 'flex', gap: 8, alignItems: 'flex-start',
                        }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                            background: 'rgba(0,184,148,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.6rem', fontWeight: 700, color: '#00B894',
                          }}>{i + 1}</div>
                          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.55, margin: 0 }}>
                            {item}
                          </p>
                        </div>
                      ))}
                    </div>
                    {/* Source links for positive mentions */}
                    {(result.positive_sources || []).length > 0 && (
                      <div style={{ marginTop: '1rem', paddingLeft: 8, paddingTop: '0.75rem', borderTop: '1px solid rgba(0,184,148,0.1)' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                          Sources
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {(result.positive_sources || []).slice(0, 5).map((src, i) => (
                            <a
                              key={i} href={src.link} target="_blank" rel="noopener noreferrer"
                              style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                fontSize: '0.72rem', color: '#00B894', textDecoration: 'none',
                                opacity: 0.8, transition: 'opacity 0.2s',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
                            >
                              <ExternalLink size={10} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                                {src.title || src.link}
                              </span>
                              <Badge bg="rgba(0,184,148,0.1)" fg="#00B894">{src.platform}</Badge>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* COMPLAINTS (with source links) */}
                  <div style={{
                    borderRadius: 14, padding: '1.25rem',
                    background: 'rgba(225,112,85,0.04)',
                    border: '1px solid rgba(225,112,85,0.12)',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, width: 3, height: '100%',
                      background: 'linear-gradient(180deg, #E17055, #FAB1A0)',
                      borderRadius: '0 2px 2px 0',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1rem', paddingLeft: 8 }}>
                      <ShieldAlert size={15} color="#E17055" />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E17055', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        What Customers Don't Like
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 8 }}>
                      {(result.wow_insights.complaints || []).map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                            background: 'rgba(225,112,85,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.6rem', fontWeight: 700, color: '#E17055',
                          }}>{i + 1}</div>
                          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.55, margin: 0 }}>
                            {item}
                          </p>
                        </div>
                      ))}
                    </div>
                    {/* Source links for negative mentions */}
                    {(result.negative_sources || []).length > 0 && (
                      <div style={{ marginTop: '1rem', paddingLeft: 8, paddingTop: '0.75rem', borderTop: '1px solid rgba(225,112,85,0.1)' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                          Sources
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {(result.negative_sources || []).slice(0, 5).map((src, i) => (
                            <a
                              key={i} href={src.link} target="_blank" rel="noopener noreferrer"
                              style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                fontSize: '0.72rem', color: '#E17055', textDecoration: 'none',
                                opacity: 0.8, transition: 'opacity 0.2s',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
                            >
                              <ExternalLink size={10} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                                {src.title || src.link}
                              </span>
                              <Badge bg="rgba(225,112,85,0.1)" fg="#E17055">{src.platform}</Badge>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SUGGESTIONS */}
                  <div style={{
                    borderRadius: 14, padding: '1.25rem',
                    background: 'rgba(108,92,231,0.04)',
                    border: '1px solid rgba(108,92,231,0.12)',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, width: 3, height: '100%',
                      background: 'linear-gradient(180deg, #6C5CE7, #A29BFE)',
                      borderRadius: '0 2px 2px 0',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1rem', paddingLeft: 8 }}>
                      <Target size={15} color="#6C5CE7" />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A29BFE', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Recommendations
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 8 }}>
                      {(result.wow_insights.suggestions || []).map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                            background: 'rgba(108,92,231,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Zap size={10} color="#A29BFE" />
                          </div>
                          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.55, margin: 0 }}>
                            {item}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Mentions Tabs ────────────────── */}
          <Section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {([['top', 'Top 5 Mentions'], ['all', `All Mentions (${result.all_mentions?.length || 0})`]] as const).map(([key, label]) => (
                  <button key={key}
                    className={`btn btn-sm ${activeTab === key ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveTab(key as 'top' | 'all')}
                    style={{
                      fontSize: '0.75rem', fontWeight: 600, padding: '6px 14px',
                      borderRadius: 8, letterSpacing: '0.01em', border: 'none',
                    }}
                  >{label}</button>
                ))}
              </div>

              {activeTab === 'all' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Filter size={13} color="var(--color-text-muted)" />
                  {(['all', 'Positive', 'Negative', 'Neutral'] as const).map((f) => (
                    <button key={f}
                      onClick={() => setSentimentFilter(f)}
                      style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 600,
                        border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                        background: sentimentFilter === f
                          ? (f === 'all' ? 'var(--color-primary)' : `${S[f as keyof typeof S]}20`)
                          : 'rgba(255,255,255,0.04)',
                        color: sentimentFilter === f
                          ? (f === 'all' ? '#fff' : S[f as keyof typeof S])
                          : 'var(--color-text-muted)',
                      }}
                    >
                      {f === 'all' ? 'All' : f}
                      {f !== 'all' && result.sentiment_breakdown?.[f] && (
                        <span style={{ opacity: 0.6, marginLeft: 3 }}>({result.sentiment_breakdown[f].count})</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Advanced Filters (All Mentions) ── */}
            {activeTab === 'all' && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
                padding: '10px 14px', borderRadius: 10, marginBottom: 14,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
              }}>
                {/* Platform */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Globe size={13} color="var(--color-text-muted)" />
                  <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}
                    style={{
                      background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 6, padding: '4px 8px', fontSize: '0.72rem', color: '#E0E0E0',
                      outline: 'none', cursor: 'pointer',
                    }}>
                    <option value="all" style={{ background: '#1A1A2E', color: '#E0E0E0' }}>All Platforms</option>
                    {availablePlatforms.map(p => (
                      <option key={p} value={p} style={{ background: '#1A1A2E', color: '#E0E0E0' }}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Search */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 150 }}>
                  <Search size={13} color="var(--color-text-muted)" />
                  <input type="text" placeholder="Search title or snippet..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 6, padding: '4px 8px', fontSize: '0.72rem', color: 'var(--color-text)',
                      outline: 'none', flex: 1,
                    }} />
                </div>

                {/* Min Views */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Eye size={13} color="var(--color-text-muted)" />
                  <input type="number" placeholder="Min views" min={0}
                    value={minViews || ''} onChange={e => setMinViews(Number(e.target.value) || 0)}
                    style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 6, padding: '4px 8px', fontSize: '0.72rem', color: 'var(--color-text)',
                      outline: 'none', width: 80,
                    }} />
                </div>

                {/* Date Sort */}
                <button onClick={() => { setSortBy('date'); setSortOrder(s => s === 'desc' ? 'asc' : 'desc'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                    borderRadius: 6, fontSize: '0.68rem', fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    background: sortBy === 'date' ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.05)',
                    color: sortBy === 'date' ? '#A78BFA' : 'var(--color-text-muted)',
                  }}>
                  {sortOrder === 'desc' && sortBy === 'date' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                  Date
                </button>

                {/* Sort by Views */}
                <button onClick={() => { setSortBy('views'); setSortOrder(s => s === 'desc' ? 'asc' : 'desc'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                    borderRadius: 6, fontSize: '0.68rem', fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    background: sortBy === 'views' ? 'rgba(253,203,110,0.12)' : 'rgba(255,255,255,0.05)',
                    color: sortBy === 'views' ? '#FDCB6E' : 'var(--color-text-muted)',
                  }}>
                  {sortOrder === 'desc' && sortBy === 'views' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                  Views
                </button>

                {/* Result count */}
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                  {filteredMentions.length} result{filteredMentions.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* ── Top Mentions ── */}
            {activeTab === 'top' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(result.top_mentions || []).map((mention, i) => (
                  <div key={i} style={{
                    padding: '1rem 1.25rem', borderRadius: 12,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.2s ease',
                  }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(108,92,231,0.25)';
                      e.currentTarget.style.background = 'rgba(108,92,231,0.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                        fontSize: '0.7rem', fontWeight: 700, color: '#fff',
                      }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <a href={mention.link} target="_blank" rel="noopener noreferrer"
                          style={{
                            fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text)',
                            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5,
                          }}>
                          {mention.title || 'Untitled'}
                          <ExternalLink size={13} style={{ flexShrink: 0, opacity: 0.4 }} />
                        </a>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                          <PlatformBadge platform={mention.platform} />
                          <SentimentBadge sentiment={mention.sentiment} />
                          {mention.subreddit && (
                            <Badge bg="rgba(0,210,211,0.1)" fg="#00D2D3">r/{mention.subreddit}</Badge>
                          )}
                        </div>
                        {mention.snippet && (
                          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginTop: 8, margin: '8px 0 0' }}>
                            {mention.snippet}
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                          {mention.estimated_reach != null && mention.estimated_reach > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: '#FDCB6E' }}>
                              <Eye size={12} /> {formatReach(mention.estimated_reach)} views
                            </span>
                          )}
                          {mention.upvotes != null && mention.upvotes > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                              <ArrowUp size={12} /> {mention.upvotes}
                            </span>
                          )}
                          {mention.num_comments != null && mention.num_comments > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                              <MessageCircle size={12} /> {mention.num_comments}
                            </span>
                          )}
                          {mention.date && <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{mention.date}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {(result.top_mentions || []).length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem', fontSize: '0.85rem' }}>No top mentions found.</p>
                )}
              </div>
            )}

            {/* ── All Mentions Table ── */}
            {activeTab === 'all' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr>
                      {['#', 'Title', 'Platform', 'Sentiment', 'Est. Views', 'Upvotes', 'Date'].map((h) => (
                        <th key={h} style={{
                          padding: '8px 10px', textAlign: 'left', fontSize: '0.65rem',
                          color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
                          borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap', fontWeight: 700,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMentions.map((m, i) => (
                      <tr key={i}
                        style={{ transition: 'background 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '8px 10px', color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>{i + 1}</td>
                        <td style={{ padding: '8px 10px', maxWidth: 280 }}>
                          <a href={m.link} target="_blank" rel="noopener noreferrer"
                            style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}
                            title={m.title}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title || 'Untitled'}</span>
                            <ExternalLink size={11} style={{ flexShrink: 0, opacity: 0.3 }} />
                          </a>
                        </td>
                        <td style={{ padding: '8px 10px' }}><PlatformBadge platform={m.platform} /></td>
                        <td style={{ padding: '8px 10px' }}><SentimentBadge sentiment={m.sentiment} /></td>
                        <td style={{ padding: '8px 10px', color: '#FDCB6E', fontSize: '0.75rem', fontWeight: 600 }}>
                          {m.estimated_reach ? formatReach(m.estimated_reach) : '—'}
                        </td>
                        <td style={{ padding: '8px 10px', color: 'var(--color-text-secondary)' }}>
                          {m.upvotes != null && m.upvotes > 0 ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><ArrowUp size={11} /> {m.upvotes}</span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '8px 10px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontSize: '0.72rem' }}>
                          {m.date || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredMentions.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem', fontSize: '0.85rem' }}>
                    {sentimentFilter === 'all' ? 'No mentions found.' : `No ${sentimentFilter.toLowerCase()} mentions.`}
                  </p>
                )}
              </div>
            )}
          </Section>

          {/* ── Competitor Comparison ─────── */}
          <Section>
            <button onClick={() => setShowCompare(!showCompare)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text)', padding: 0,
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Swords size={18} color="var(--color-primary)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Compare with Competitor</span>
              </div>
              {showCompare ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showCompare && (
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                  <div style={{ flex: 2, minWidth: 200 }}>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                      Competitor Brand
                    </label>
                    <input id="competitor-input" className="input" type="text"
                      placeholder="Enter competitor name..."
                      value={competitorName} onChange={(e) => setCompetitorName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !competitorLoading && handleCompetitorTrack()}
                      disabled={competitorLoading}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                  </div>
                  <button className="btn btn-primary" onClick={handleCompetitorTrack}
                    disabled={competitorLoading || !competitorName.trim()}
                    style={{ height: 42, minWidth: 130, fontSize: '0.8rem', fontWeight: 600, border: 'none' }}>
                    {competitorLoading
                      ? <><Loader size={15} style={{ animation: 'spin 1.5s linear infinite' }} />Tracking...</>
                      : <><Swords size={15} />Compare</>}
                  </button>
                </div>

                {competitorLoading && (
                  <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <Loader size={22} color="var(--color-primary)" style={{ animation: 'spin 1.5s linear infinite', marginBottom: 8 }} />
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Tracking competitor... 2-4 min</p>
                  </div>
                )}

                {competitorResult && !competitorLoading && (() => {
                  const bWow = result.wow_score ?? 0;
                  const cWow = competitorResult.wow_score ?? 0;
                  const bReach = result.estimated_reach ?? 0;
                  const cReach = competitorResult.estimated_reach ?? 0;
                  const bPos = result.sentiment_breakdown?.Positive?.percentage ?? 0;
                  const cPos = competitorResult.sentiment_breakdown?.Positive?.percentage ?? 0;
                  const bNeg = result.sentiment_breakdown?.Negative?.percentage ?? 0;
                  const cNeg = competitorResult.sentiment_breakdown?.Negative?.percentage ?? 0;
                  const bPlats = Object.keys(result.platform_breakdown).length;
                  const cPlats = Object.keys(competitorResult.platform_breakdown).length;

                  const extendedMetrics = [
                    { metric: 'WOW Score', brand: bWow, competitor: cWow, suffix: '/100', higherWins: true },
                    { metric: 'Total Mentions', brand: result.total_mentions, competitor: competitorResult.total_mentions, suffix: '', higherWins: true },
                    { metric: 'Est. Reach', brand: bReach, competitor: cReach, suffix: '', higherWins: true, format: true },
                    { metric: 'Positive %', brand: bPos, competitor: cPos, suffix: '%', higherWins: true },
                    { metric: 'Negative %', brand: bNeg, competitor: cNeg, suffix: '%', higherWins: false },
                    { metric: 'Platforms', brand: bPlats, competitor: cPlats, suffix: '', higherWins: true },
                  ];

                  // Count wins
                  let brandWinsCount = 0;
                  let compWinsCount = 0;
                  extendedMetrics.forEach(m => {
                    const brandBetter = m.higherWins ? m.brand > m.competitor : m.brand < m.competitor;
                    if (brandBetter) brandWinsCount++;
                    else if (m.brand !== m.competitor) compWinsCount++;
                  });

                  const verdictColor = brandWinsCount > compWinsCount ? '#00B894' : brandWinsCount < compWinsCount ? '#E17055' : '#FDCB6E';
                  const verdictText = brandWinsCount > compWinsCount
                    ? `${result.brand_name} leads in ${brandWinsCount} out of ${extendedMetrics.length} key metrics`
                    : brandWinsCount < compWinsCount
                    ? `${competitorResult.brand_name} leads in ${compWinsCount} out of ${extendedMetrics.length} key metrics`
                    : 'Both brands are evenly matched';

                  return (
                    <>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '1rem' }}>
                        <span className="gradient-text">"{result.brand_name}"</span>
                        <span style={{ color: 'var(--color-text-muted)', margin: '0 8px', fontWeight: 400 }}>vs</span>
                        <span style={{ color: '#E17055' }}>"{competitorResult.brand_name}"</span>
                      </h4>

                      {/* Verdict Banner */}
                      <div style={{
                        padding: '1rem 1.25rem', borderRadius: 14, marginBottom: '1.5rem',
                        background: `${verdictColor}08`, border: `1px solid ${verdictColor}25`,
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: `${verdictColor}18`, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Swords size={20} color={verdictColor} />
                        </div>
                        <div>
                          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: verdictColor }}>
                            {brandWinsCount > compWinsCount ? '🏆 ' : brandWinsCount < compWinsCount ? '⚡ ' : '⚖️ '}
                            {verdictText}
                          </p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                            Score: {result.brand_name} {bWow}/100 vs {competitorResult.brand_name} {cWow}/100
                          </p>
                        </div>
                      </div>

                      {/* Metric Cards Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: '1.5rem' }}>
                        {extendedMetrics.map((item) => {
                          const brandBetter = item.higherWins ? item.brand >= item.competitor : item.brand <= item.competitor;
                          const isTied = item.brand === item.competitor;
                          const fmtVal = (v: number) => item.format ? formatReach(v) : `${v}${item.suffix}`;
                          return (
                            <div key={item.metric} style={{
                              padding: '0.9rem', borderRadius: 12,
                              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                            }}>
                              <p style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 8 }}>
                                {item.metric}
                              </p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: isTied ? 'var(--color-text)' : (brandBetter ? '#00B894' : 'var(--color-text)') }}>
                                  {fmtVal(item.brand)}
                                </span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>vs</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: isTied ? 'var(--color-text)' : (!brandBetter ? '#00B894' : 'var(--color-text)') }}>
                                  {fmtVal(item.competitor)}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                                <span>{result.brand_name}</span>
                                <span>{competitorResult.brand_name}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Sentiment Battle Chart */}
                      <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                        Sentiment Comparison
                      </h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={[
                          { name: 'Positive', brand: result.sentiment_breakdown?.Positive?.count ?? 0, competitor: competitorResult.sentiment_breakdown?.Positive?.count ?? 0 },
                          { name: 'Neutral', brand: result.sentiment_breakdown?.Neutral?.count ?? 0, competitor: competitorResult.sentiment_breakdown?.Neutral?.count ?? 0 },
                          { name: 'Negative', brand: result.sentiment_breakdown?.Negative?.count ?? 0, competitor: competitorResult.sentiment_breakdown?.Negative?.count ?? 0 },
                        ]} margin={{ left: 10, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="name" tick={{ fill: '#A0A0B0', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#A0A0B0', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                          <Bar dataKey="brand" name={result.brand_name} fill="#6C5CE7" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="competitor" name={competitorResult.brand_name} fill="#E17055" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>

                      {/* Strategic Insights */}
                      <div style={{
                        marginTop: '1.5rem', padding: '1.25rem', borderRadius: 14,
                        background: 'rgba(108,92,231,0.04)', border: '1px solid rgba(108,92,231,0.12)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <Lightbulb size={16} color="#FDCB6E" />
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FDCB6E', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Strategic Insights
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                          {bWow > cWow && (
                            <p>✅ <strong>{result.brand_name}</strong> has a stronger overall WOW presence ({bWow} vs {cWow}), indicating better organic word-of-mouth momentum.</p>
                          )}
                          {bWow < cWow && (
                            <p>⚠️ <strong>{competitorResult.brand_name}</strong> has a stronger WOW Score ({cWow} vs {bWow}). Consider increasing authentic engagement and expanding platform presence.</p>
                          )}
                          {bReach > cReach && (
                            <p>📣 <strong>{result.brand_name}</strong> generates {Math.round(bReach / Math.max(cReach, 1))}x more estimated visibility, suggesting stronger content amplification.</p>
                          )}
                          {bReach < cReach && (
                            <p>📣 <strong>{competitorResult.brand_name}</strong> has {formatReach(cReach)} est. reach vs your {formatReach(bReach)}. Focus on high-engagement platforms to close the gap.</p>
                          )}
                          {bPos > cPos && (
                            <p>💚 <strong>{result.brand_name}</strong> enjoys higher positive sentiment ({bPos}% vs {cPos}%), showing stronger customer satisfaction.</p>
                          )}
                          {bNeg > cNeg && bNeg > 15 && (
                            <p>🔴 <strong>{result.brand_name}</strong> has more negative mentions ({bNeg}% vs {cNeg}%). Investigate common complaints and address them proactively.</p>
                          )}
                          {bPlats > cPlats && (
                            <p>🌐 <strong>{result.brand_name}</strong> is discussed across more platforms ({bPlats} vs {cPlats}), indicating broader organic reach and diversity.</p>
                          )}
                          {bPlats < cPlats && (
                            <p>🌐 <strong>{competitorResult.brand_name}</strong> appears on more platforms. Consider expanding your presence to {cPlats - bPlats} more channel(s).</p>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
