import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Copy, Check, ExternalLink, Loader, Share2, Sparkles, Users,
  Linkedin, Twitter, MessageSquare, Award, ChevronRight,
} from 'lucide-react';
import api from '../lib/api';

/* ═══════════════════════════════════════════════════════
   Public Campaign Share Page
   /campaign/:id?product=X&ref=website
   ═══════════════════════════════════════════════════════ */

interface CampaignData {
  campaignId: string;
  title: string;
  description: string;
  brandName: string;
  embedSettings: {
    shareFlow?: {
      suggestedText: string;
      hashtags: string;
    };
  };
}

export default function CampaignPublicPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const product = searchParams.get('product') || '';
  const ref = searchParams.get('ref') || '';

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [error, setError] = useState('');
  const [postText, setPostText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/embed/${id}`).then(res => {
      if (res.data?.data) {
        const data = res.data.data;
        setCampaign(data);
        const suggested = data.embedSettings?.shareFlow?.suggestedText
          || `I've been using ${data.brandName} and it's amazing 🚀`;
        const hashtags = data.embedSettings?.shareFlow?.hashtags || '#WordOfWow';
        const productName = product || data.brandName || 'this product';
        setPostText(suggested.replace('{product}', productName) + ' ' + hashtags);
      } else {
        setError('Campaign not found or no longer active.');
      }
    }).catch(() => {
      setError('Campaign not found or no longer active.');
    }).finally(() => setLoading(false));
  }, [id, product]);

  const handleCopy = () => {
    navigator.clipboard.writeText(postText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${encodeURIComponent(postText)}`;
    window.open(url, '_blank');
  };

  const shareOnTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(postText)}`;
    window.open(url, '_blank');
  };

  const shareOnReddit = () => {
    const url = `https://www.reddit.com/submit?title=${encodeURIComponent(postText)}&selftext=true`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0A0A14 0%, #0F0F1A 50%, #141428 100%)',
      }}>
        <Loader size={32} style={{ animation: 'spin 1.5s linear infinite', color: '#A78BFA' }} />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0A0A14 0%, #0F0F1A 50%, #141428 100%)',
        color: '#E0E0E0',
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Campaign Not Found</h2>
          <p style={{ color: '#A0A0B0' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0A0A14 0%, #0F0F1A 50%, #141428 100%)',
      color: '#E0E0E0',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Hero */}
      <div style={{
        maxWidth: 680, margin: '0 auto', padding: '3rem 1.5rem',
      }}>
        {/* Brand badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: '2rem',
          padding: '8px 16px', borderRadius: 50,
          background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)',
        }}>
          <Sparkles size={14} color="#A78BFA" />
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#A78BFA' }}>
            {campaign.brandName} × Word of Wow
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800,
          letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '0.75rem',
        }}>
          Spread the Word of Wow
          <span style={{
            background: 'linear-gradient(135deg, #A78BFA, #00B894)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}> & Earn Rewards</span>
        </h1>

        <p style={{
          fontSize: '1rem', color: '#A0A0B0', lineHeight: 1.6,
          maxWidth: 500, marginBottom: '2rem',
        }}>
          Share your honest experience with <strong style={{ color: '#E0E0E0' }}>{campaign.brandName}</strong> on 
          social media and earn exciting discounts, coupons, and exclusive offers!
        </p>

        {/* Social Proof */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: '2.5rem',
          padding: '10px 18px', borderRadius: 12,
          background: 'rgba(0,184,148,0.06)', border: '1px solid rgba(0,184,148,0.12)',
        }}>
          <Users size={16} color="#00B894" />
          <span style={{ fontSize: '0.8rem', color: '#00B894', fontWeight: 600 }}>
            1,200+ people already spreading the Word of Wow
          </span>
        </div>

        {/* Post Editor */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 20, padding: '1.75rem', marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Share2 size={18} color="#A78BFA" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Your Post</h2>
          </div>

          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            style={{
              width: '100%', minHeight: 120, resize: 'vertical',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '14px 16px', fontSize: '0.92rem',
              color: '#E0E0E0', outline: 'none', lineHeight: 1.7,
              fontFamily: "'Inter', -apple-system, sans-serif",
            }}
          />

          {/* Copy */}
          <button onClick={handleCopy}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, marginTop: 12,
              padding: '8px 16px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: copied ? 'rgba(0,184,148,0.12)' : 'rgba(255,255,255,0.05)',
              color: copied ? '#00B894' : '#A0A0B0', transition: 'all 0.2s',
            }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>

        {/* Share Buttons */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem',
          marginBottom: '2rem',
        }}>
          <button onClick={shareOnLinkedIn}
            style={{
              padding: '14px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'rgba(0,119,181,0.12)', color: '#0077B5', fontWeight: 700,
              fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
            }}>
            <Linkedin size={18} /> LinkedIn
          </button>
          <button onClick={shareOnTwitter}
            style={{
              padding: '14px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'rgba(29,161,242,0.12)', color: '#1DA1F2', fontWeight: 700,
              fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
            }}>
            <Twitter size={18} /> Twitter
          </button>
          <button onClick={shareOnReddit}
            style={{
              padding: '14px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'rgba(255,69,0,0.12)', color: '#FF4500', fontWeight: 700,
              fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
            }}>
            <MessageSquare size={18} /> Reddit
          </button>
        </div>

        {/* Rewards Section */}
        <div style={{
          background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.1)',
          borderRadius: 20, padding: '1.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Award size={20} color="#FFD700" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>What You'll Earn</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '🎟️', text: 'Exclusive discount coupons from the brand' },
              { icon: '⭐', text: 'Priority access to new products and features' },
              { icon: '🏆', text: 'Recognition on the Word of Wow leaderboard' },
              { icon: '🎁', text: 'Special rewards for high-quality posts' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.02)',
              }}>
                <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                <span style={{ fontSize: '0.85rem', color: '#C0C0D0' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
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
    </div>
  );
}
