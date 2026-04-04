import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card } from '../../components/shared/Card';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/campaigns/${id}`);
        setCampaign(res.data.data);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  if (loading) return <LoadingSkeleton lines={10} height={24} />;
  if (!campaign) return <p style={{ color: 'var(--color-text-muted)', padding: '2rem' }}>Campaign not found.</p>;

  const tiers = campaign.coupon_tiers || [];

  return (
    <div className="animate-fade-in">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 'var(--space-md)' }}>
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header */}
      <Card style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>{campaign.brand_name || 'Brand'}</p>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{campaign.title}</h1>
          </div>
          <StatusBadge status={campaign.status || 'active'} />
        </div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{campaign.description}</p>
      </Card>

      <div className="content-grid">
        {/* Guidelines */}
        {campaign.guidelines && (
          <Card>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>📋 Guidelines</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {campaign.guidelines}
            </p>
          </Card>
        )}

        {/* Keywords */}
        {campaign.keywords?.length > 0 && (
          <Card>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>🏷️ Keywords</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {campaign.keywords.map((kw: string, i: number) => (
                <span key={i} style={{
                  padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-full)',
                  background: 'rgba(108, 92, 231, 0.15)', color: 'var(--color-primary-light)',
                  fontSize: '0.8rem', fontWeight: 500,
                }}>#{kw}</span>
              ))}
            </div>
          </Card>
        )}

        {/* Reward Tiers */}
        <Card>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>🎁 Reward Tiers</h3>
          {tiers.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)' }}>Score Range</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)' }}>Discount</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier: any, i: number) => (
                  <tr key={i}>
                    <td style={{ padding: '0.5rem', fontSize: '0.85rem' }}>{tier.min_score} – {tier.max_score}</td>
                    <td style={{ padding: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-success)' }}>{tier.discount_percent}% OFF</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Reward tiers not yet configured.</p>
          )}
        </Card>

        {/* Campaign Info */}
        <Card>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>ℹ️ Campaign Info</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            {campaign.platforms && <div><span style={{ color: 'var(--color-text-muted)' }}>Platforms:</span> {campaign.platforms.join(', ')}</div>}
            {campaign.campaign_type && <div><span style={{ color: 'var(--color-text-muted)' }}>Type:</span> <span style={{ textTransform: 'capitalize' }}>{campaign.campaign_type}</span></div>}
            {campaign.min_score_threshold && <div><span style={{ color: 'var(--color-text-muted)' }}>Min Score:</span> {campaign.min_score_threshold}</div>}
            {campaign.end_date && <div><span style={{ color: 'var(--color-text-muted)' }}>Deadline:</span> {new Date(campaign.end_date).toLocaleDateString()}</div>}
          </div>
        </Card>
      </div>

      {/* Submit CTA */}
      <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center' }}>
        <button className="btn btn-primary btn-lg" onClick={() => navigate(`/advocate/submit/${campaign.id}`)}
          style={{ padding: '0.9rem 3rem', fontSize: '1.05rem' }}>
          Submit Your Post
        </button>
      </div>
    </div>
  );
}
