import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { CouponCard } from '../../components/shared/CouponCard';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import { useNavigate } from 'react-router-dom';

export default function RewardsPage() {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'used' | 'expired'>('all');

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const res = await api.get('/submissions?status=approved&limit=100');
        // Flatten coupons from submissions
        const subs = res.data.data || [];
        const couponList = subs
          .filter((s: any) => s.coupon_code)
          .map((s: any) => ({
            code: s.coupon_code,
            discountPercent: s.discount_percent || 0,
            campaignName: s.campaign_title || 'Campaign',
            expiresAt: s.coupon_expires_at,
            usedAt: s.coupon_used_at,
          }));
        setCoupons(couponList);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    fetchCoupons();
  }, []);

  const now = new Date();
  const filtered = coupons.filter((c) => {
    if (filter === 'active') return !c.usedAt && (!c.expiresAt || new Date(c.expiresAt) > now);
    if (filter === 'used') return !!c.usedAt;
    if (filter === 'expired') return !c.usedAt && c.expiresAt && new Date(c.expiresAt) <= now;
    return true;
  });

  if (loading) return <LoadingSkeleton lines={6} height={24} />;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Rewards</h1>
        <p>Your earned coupon codes from approved submissions.</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
        {(['all', 'active', 'used', 'expired'] as const).map((f) => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>
            {f} {f === 'active' && filtered.length > 0 ? `(${filtered.length})` : ''}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="Complete campaign submissions to earn discount coupons!"
          action={{ label: 'Browse Campaigns', onClick: () => navigate('/advocate/campaigns') }} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-md)' }}>
          {filtered.map((coupon, i) => (
            <CouponCard key={i} code={coupon.code} discountPercent={coupon.discountPercent}
              campaignName={coupon.campaignName} expiresAt={coupon.expiresAt} />
          ))}
        </div>
      )}
    </div>
  );
}
