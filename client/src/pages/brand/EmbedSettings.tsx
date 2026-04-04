import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Code, Copy, Check, ToggleLeft, ToggleRight, Eye, ExternalLink,
  MessageSquare, LogOut, Layout, Share2, Loader, Settings,
  Sparkles, Zap, Globe,
} from 'lucide-react';
import api from '../../lib/api';

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */
interface WidgetConfig {
  enabled: boolean;
  headline: string;
  cta: string;
  [key: string]: any;
}

interface EmbedSettings {
  stickyPill: WidgetConfig;
  exitIntent: WidgetConfig;
  embedSection: WidgetConfig;
  shareFlow: WidgetConfig;
}

interface Campaign { id: string; title: string; status: string }

const DEFAULT_EMBED: EmbedSettings = {
  stickyPill: {
    enabled: true,
    headline: 'Loved using {brand}? Spread the Word of WOW 💬',
    cta: 'Get Exciting Rewards & Discounts 🎁',
    rewardText: 'Get Exciting Rewards & Discounts!',
  },
  exitIntent: {
    enabled: true,
    headline: 'Before you go... {brand} has a surprise 🎁',
    subtext: 'Spread the Word of WOW 💬 Talking About Your Experience With Us & Get EXCITING Rewards & Discounts.',
    cta: 'Claim Now!',
  },
  embedSection: {
    enabled: false,
    headline: '💡 Spread the Word of Wow',
    description: 'Share your honest experience and get exciting rewards & discounts',
    cta: 'Get Exciting Rewards & Discounts',
  },
  shareFlow: {
    enabled: true,
    headline: '✍️ Share Your Experience',
    suggestedText: "I've been using {product} and it's amazing 🚀",
    hashtags: '#WordOfWow',
    cta: 'Get Exciting Rewards & Discounts',
  },
};

/* ═══════════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════════ */
const card = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 16,
  padding: '1.5rem',
  marginBottom: '1rem',
};

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: '0.82rem',
  color: '#E0E0E0',
  outline: 'none',
  marginTop: 4,
};

const labelStyle = {
  fontSize: '0.7rem',
  fontWeight: 600 as const,
  color: '#A0A0B0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  display: 'block' as const,
  marginBottom: 2,
};

/* ═══════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════ */
export default function EmbedSettings() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [settings, setSettings] = useState<EmbedSettings>(DEFAULT_EMBED);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string>('');
  const [activePreview, setActivePreview] = useState<string>('stickyPill');

  const baseUrl = 'https://wordofwow.com';

  useEffect(() => {
    api.get('/campaigns').then(res => {
      // Handle both response shapes: { campaigns: [...] } or direct array
      const raw = res.data?.campaigns || res.data?.data?.campaigns || res.data || [];
      const list = Array.isArray(raw) ? raw : [];
      const active = list.filter((c: any) => c.status === 'active');
      setCampaigns(active);
      if (active.length > 0) {
        setSelectedCampaign(active[0].id);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCampaign) return;
    api.get(`/embed/${selectedCampaign}`).then(res => {
      const data = res.data?.data;
      if (data?.embedSettings) {
        setSettings({ ...DEFAULT_EMBED, ...data.embedSettings });
      }
      // Auto-populate brand name into "Loved Using ..." headlines
      const brandName = data?.brandName || '';
      if (brandName) {
        setSettings(prev => ({
          ...prev,
          stickyPill: { ...prev.stickyPill, headline: prev.stickyPill.headline.includes(brandName) ? prev.stickyPill.headline : `💬 Loved using ${brandName}?` },
          exitIntent: { ...prev.exitIntent, headline: prev.exitIntent.headline.includes(brandName) ? prev.exitIntent.headline : `Before you go... ${brandName} has a surprise 🎁` },
          shareFlow: { ...prev.shareFlow, suggestedText: prev.shareFlow.suggestedText?.includes('{product}') ? prev.shareFlow.suggestedText.replace('{product}', brandName) : prev.shareFlow.suggestedText },
        }));
      }
    }).catch(() => {});
  }, [selectedCampaign]);

  const handleSave = async () => {
    if (!selectedCampaign) return;
    setSaving(true);
    try {
      await api.patch(`/embed/${selectedCampaign}`, { embedSettings: settings });
    } catch {} finally { setSaving(false); }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const updateWidget = (widget: keyof EmbedSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [widget]: { ...prev[widget], [field]: value },
    }));
  };

  const scriptTag = `<script src="${baseUrl}/sdk.js" data-campaign-id="${selectedCampaign}"></script>`;
  const campaignLink = `${baseUrl}/campaign/${selectedCampaign}`;
  const embedDiv = '<div id="wow-embed"></div>';

  const WIDGETS: { key: keyof EmbedSettings; icon: any; title: string; desc: string }[] = [
    { key: 'stickyPill', icon: MessageSquare, title: 'Sticky Pill CTA', desc: 'Floating button at bottom-right' },
    { key: 'exitIntent', icon: LogOut, title: 'Exit Intent Popup', desc: 'Shows when user is about to leave' },
    { key: 'embedSection', icon: Layout, title: 'Embedded Section', desc: 'Place anywhere with a div' },
    { key: 'shareFlow', icon: Share2, title: 'Pre-filled Share Flow', desc: 'Campaign page with suggested post' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader size={28} style={{ animation: 'spin 1.5s linear infinite', color: '#A78BFA' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            <Sparkles size={22} style={{ verticalAlign: 'middle', marginRight: 8, color: '#A78BFA' }} />
            Embed & Activate
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#A0A0B0', marginTop: 4 }}>
            Install conversion-focused advocacy triggers on your website
          </p>
        </div>
        <button onClick={handleSave} disabled={saving || !selectedCampaign}
          style={{
            padding: '10px 24px', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem',
            border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #A78BFA, #6C5CE7)', color: '#fff',
            opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6,
          }}>
          {saving ? <Loader size={15} style={{ animation: 'spin 1.5s linear infinite' }} /> : <Check size={15} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Campaign Selector */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={labelStyle}>Select Campaign</label>
          <select value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}>
            {campaigns.length === 0 && <option value="">No active campaigns</option>}
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div style={{ flex: 2, minWidth: 300 }}>
          <label style={labelStyle}>Campaign Link</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
            <code style={{
              flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: '0.75rem',
              background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)',
              color: '#A78BFA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{campaignLink}</code>
            <button onClick={() => handleCopy(campaignLink, 'link')}
              style={{ padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
              {copied === 'link' ? <Check size={14} color="#00B894" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout: Controls + Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left: Widget Controls */}
        <div>
          {WIDGETS.map(({ key, icon: Icon, title, desc }) => {
            const widget = settings[key];
            return (
              <div key={key} style={{
                ...card,
                borderColor: activePreview === key ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.06)',
                cursor: 'pointer',
              }} onClick={() => setActivePreview(key)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      background: widget.enabled ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.04)',
                    }}>
                      <Icon size={18} color={widget.enabled ? '#A78BFA' : '#666'} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.88rem', fontWeight: 700 }}>{title}</h3>
                      <p style={{ fontSize: '0.7rem', color: '#A0A0B0' }}>{desc}</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); updateWidget(key, 'enabled', !widget.enabled); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    {widget.enabled
                      ? <ToggleRight size={28} color="#A78BFA" />
                      : <ToggleLeft size={28} color="#555" />}
                  </button>
                </div>

                {widget.enabled && activePreview === key && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <label style={labelStyle}>Headline</label>
                      <input value={widget.headline} onChange={e => updateWidget(key, 'headline', e.target.value)}
                        style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>CTA Text</label>
                      <input value={widget.cta} onChange={e => updateWidget(key, 'cta', e.target.value)}
                        style={inputStyle} />
                    </div>
                    {widget.rewardText !== undefined && (
                      <div>
                        <label style={labelStyle}>Reward Text</label>
                        <input value={widget.rewardText || ''} onChange={e => updateWidget(key, 'rewardText', e.target.value)}
                          style={inputStyle} />
                      </div>
                    )}
                    {widget.subtext !== undefined && (
                      <div>
                        <label style={labelStyle}>Subtext</label>
                        <input value={widget.subtext || ''} onChange={e => updateWidget(key, 'subtext', e.target.value)}
                          style={inputStyle} />
                      </div>
                    )}
                    {widget.description !== undefined && (
                      <div>
                        <label style={labelStyle}>Description</label>
                        <input value={widget.description || ''} onChange={e => updateWidget(key, 'description', e.target.value)}
                          style={inputStyle} />
                      </div>
                    )}
                    {widget.suggestedText !== undefined && (
                      <div>
                        <label style={labelStyle}>Suggested Post Text</label>
                        <textarea value={widget.suggestedText || ''} onChange={e => updateWidget(key, 'suggestedText', e.target.value)}
                          style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
                      </div>
                    )}
                    {widget.hashtags !== undefined && (
                      <div>
                        <label style={labelStyle}>Hashtags</label>
                        <input value={widget.hashtags || ''} onChange={e => updateWidget(key, 'hashtags', e.target.value)}
                          style={inputStyle} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Script Tag */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Code size={18} color="#A78BFA" />
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700 }}>Install Script</h3>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#A0A0B0', marginBottom: 10 }}>
              Add this script tag to your website's HTML, just before &lt;/body&gt;
            </p>
            <div style={{ position: 'relative' }}>
              <code style={{
                display: 'block', padding: '12px 14px', borderRadius: 10, fontSize: '0.72rem',
                background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)',
                color: '#A78BFA', wordBreak: 'break-all', lineHeight: 1.6,
              }}>{scriptTag}</code>
              <button onClick={() => handleCopy(scriptTag, 'script')}
                style={{
                  position: 'absolute', top: 8, right: 8, padding: '5px 8px', borderRadius: 6,
                  border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', color: '#fff',
                }}>
                {copied === 'script' ? <Check size={13} color="#00B894" /> : <Copy size={13} />}
              </button>
            </div>

            {settings.embedSection.enabled && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: '0.72rem', color: '#A0A0B0', marginBottom: 6 }}>
                  For the embedded section, also add this div where you want it to appear:
                </p>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <code style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: '0.72rem',
                    background: 'rgba(0,184,148,0.06)', border: '1px solid rgba(0,184,148,0.12)',
                    color: '#00B894',
                  }}>{embedDiv}</code>
                  <button onClick={() => handleCopy(embedDiv, 'div')}
                    style={{ padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                    {copied === 'div' ? <Check size={13} color="#00B894" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Preview */}
        <div style={{
          ...card, position: 'sticky', top: 24, minHeight: 400,
          background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
            paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <Eye size={16} color="#A78BFA" />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#A0A0B0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Live Preview
            </span>
          </div>

          {/* Simulated website background */}
          <div style={{
            position: 'relative', borderRadius: 12, overflow: 'hidden',
            background: 'linear-gradient(135deg, #0F0F1A 0%, #1A1A30 100%)',
            minHeight: 350, padding: '1.5rem',
          }}>
            {/* Fake content lines */}
            <div style={{ opacity: 0.08 }}>
              {[100, 80, 90, 70, 85, 75, 65].map((w, i) => (
                <div key={i} style={{ height: 8, background: '#fff', borderRadius: 4, marginBottom: 8, width: `${w}%` }} />
              ))}
            </div>

            {/* Sticky Pill Preview */}
            {activePreview === 'stickyPill' && settings.stickyPill.enabled && (
              <div style={{
                position: 'absolute', bottom: 16, right: 16,
                padding: '10px 18px', borderRadius: 50,
                background: 'linear-gradient(135deg, #A78BFA, #6C5CE7)',
                boxShadow: '0 4px 20px rgba(167,139,250,0.4)',
                fontSize: '0.75rem', fontWeight: 600, color: '#fff',
                maxWidth: 280, cursor: 'pointer',
                animation: 'fadeInUp 0.5s ease-out',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <img src="/favicon.png" alt="WOW" style={{ width: 34, height: 34, borderRadius: '50%' }} />
                {settings.stickyPill.headline} {settings.stickyPill.cta}
              </div>
            )}

            {/* Exit Intent Preview */}
            {activePreview === 'exitIntent' && settings.exitIntent.enabled && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  background: '#1E1E32', borderRadius: 20, padding: '2rem', maxWidth: 300,
                  textAlign: 'center', border: '1px solid rgba(167,139,250,0.2)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}>
                  <img src="/favicon.png" alt="WOW" style={{ width: 52, height: 52, borderRadius: '50%', marginBottom: 8 }} />
                  <p style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>{settings.exitIntent.headline}</p>
                  <p style={{ fontSize: '0.75rem', color: '#A0A0B0', marginBottom: 16 }}>{settings.exitIntent.subtext}</p>
                  <div style={{
                    padding: '10px 20px', borderRadius: 10,
                    background: 'linear-gradient(135deg, #A78BFA, #6C5CE7)',
                    color: '#fff', fontWeight: 700, fontSize: '0.82rem',
                  }}>{settings.exitIntent.cta}</div>
                </div>
              </div>
            )}

            {/* Embed Section Preview */}
            {activePreview === 'embedSection' && settings.embedSection.enabled && (
              <div style={{
                marginTop: 20, padding: '1.5rem', borderRadius: 14,
                background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)',
                textAlign: 'center',
              }}>
                <img src="/favicon.png" alt="WOW" style={{ width: 44, height: 44, borderRadius: '50%', marginBottom: 6 }} />
                <p style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>{settings.embedSection.headline}</p>
                <p style={{ fontSize: '0.78rem', color: '#A0A0B0', marginBottom: 14 }}>{settings.embedSection.description}</p>
                <div style={{
                  display: 'inline-block', padding: '10px 24px', borderRadius: 10,
                  background: 'linear-gradient(135deg, #A78BFA, #6C5CE7)',
                  color: '#fff', fontWeight: 700, fontSize: '0.82rem',
                }}>{settings.embedSection.cta}</div>
              </div>
            )}

            {/* Share Flow Preview */}
            {activePreview === 'shareFlow' && settings.shareFlow.enabled && (
              <div style={{
                marginTop: 20, padding: '1.5rem', borderRadius: 14,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: 10, color: '#A78BFA' }}>✍️ Your Post</p>
                <div style={{
                  padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.82rem',
                  color: '#E0E0E0', lineHeight: 1.6, minHeight: 60,
                }}>
                  {settings.shareFlow.suggestedText}
                  <span style={{ color: '#A78BFA' }}> {settings.shareFlow.hashtags}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <div style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600,
                    background: '#0077B5', color: '#fff',
                  }}>LinkedIn</div>
                  <div style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600,
                    background: '#1DA1F2', color: '#fff',
                  }}>Twitter</div>
                  <div style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600,
                    background: '#FF4500', color: '#fff',
                  }}>Reddit</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
