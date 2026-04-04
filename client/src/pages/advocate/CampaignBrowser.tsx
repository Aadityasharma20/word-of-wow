import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card } from '../../components/shared/Card';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import { Search, Calendar, ArrowUpDown } from 'lucide-react';

export default function CampaignBrowser() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await api.get('/campaigns?status=active');
        setCampaigns(res.data.data || []);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    fetchCampaigns();
  }, []);

  const filtered = campaigns
    .filter((c: any) =>
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.brand_name?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a: any, b: any) => {
      if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === 'ending') return new Date(a.end_date || '9999').getTime() - new Date(b.end_date || '9999').getTime();
      return 0;
    });

  if (loading) return <LoadingSkeleton lines={10} height={24} />;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Browse Campaigns</h1>
        <p>Find campaigns to participate in and earn rewards.</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input className="input" placeholder="Search campaigns..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem' }} />
        </div>
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
          <option value="newest">Newest First</option>
          <option value="ending">Ending Soon</option>
        </select>
      </div>

      {/* Campaign Grid */}
      {filtered.length === 0 ? (
        <EmptyState message="No campaigns found. Check back soon!" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-md)' }}>
          {filtered.map((campaign: any) => (
            <Card key={campaign.id} onClick={() => navigate(`/advocate/campaigns/${campaign.id}`)}
              style={{ cursor: 'pointer', transition: 'all var(--transition-base)' }}>
              {/* Brand header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.9rem', fontWeight: 700, color: '#fff',
                }}>
                  {(campaign.brand_name || 'B').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{campaign.brand_name || 'Brand'}</p>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.3 }}>{campaign.title}</h3>
                </div>
                <StatusBadge status={campaign.status || 'active'} size="sm" />
              </div>

              {/* Description */}
              <p style={{
                fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem',
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {campaign.description || 'No description provided.'}
              </p>

              {/* Meta */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)',
                fontSize: '0.75rem', color: 'var(--color-text-muted)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{
                    padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-surface-2)', textTransform: 'capitalize',
                  }}>
                    {campaign.platforms?.join(' · ') || 'reddit'}
                  </span>
                </div>
                {campaign.end_date && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={12} />
                    <span>Ends {new Date(campaign.end_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
