import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { DataTable } from '../../components/shared/DataTable';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import { Users } from 'lucide-react';

interface AdvocateInfo {
  [key: string]: any;
  advocate_id: string;
  display_name: string;
  email: string;
  submissions_count: number;
  avg_score: number;
  platforms: string[];
  latest_submission: string;
  approved_count: number;
}

export default function AdvocatePool() {
  const [advocates, setAdvocates] = useState<AdvocateInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdvocates = async () => {
      try {
        // Fetch all submissions for brand's campaigns
        const subsRes = await api.get('/submissions?limit=500');
        const submissions = subsRes.data.data || [];

        // Group by advocate
        const advocateMap = new Map<string, AdvocateInfo>();
        for (const sub of submissions) {
          const id = sub.advocate_id;
          if (!advocateMap.has(id)) {
            advocateMap.set(id, {
              advocate_id: id,
              display_name: sub.advocate_name || 'Anonymous',
              email: sub.advocate_email || '—',
              submissions_count: 0,
              avg_score: 0,
              platforms: [],
              latest_submission: sub.created_at,
              approved_count: 0,
            });
          }
          const adv = advocateMap.get(id)!;
          adv.submissions_count += 1;
          adv.avg_score += (sub.score_final || 0);
          if (sub.platform && !adv.platforms.includes(sub.platform)) {
            adv.platforms.push(sub.platform);
          }
          if (new Date(sub.created_at) > new Date(adv.latest_submission)) {
            adv.latest_submission = sub.created_at;
          }
          if (sub.review_status === 'approved') {
            adv.approved_count += 1;
          }
        }

        // Calculate averages
        const result = Array.from(advocateMap.values()).map(a => ({
          ...a,
          avg_score: a.submissions_count > 0 ? Math.round(a.avg_score / a.submissions_count) : 0,
        })).sort((a, b) => b.submissions_count - a.submissions_count);

        setAdvocates(result);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    fetchAdvocates();
  }, []);

  const columns = [
    { key: 'display_name', label: 'Advocate', sortable: true, render: (item: AdvocateInfo) => (
      <div>
        <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.display_name}</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.email}</p>
      </div>
    )},
    { key: 'submissions_count', label: 'Submissions', sortable: true, render: (item: AdvocateInfo) => (
      <span style={{ fontWeight: 600 }}>{item.submissions_count}</span>
    )},
    { key: 'approved_count', label: 'Approved', sortable: true, render: (item: AdvocateInfo) => (
      <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>{item.approved_count}</span>
    )},
    { key: 'avg_score', label: 'Avg Score', sortable: true, render: (item: AdvocateInfo) => (
      <span style={{
        fontWeight: 600,
        color: item.avg_score >= 70 ? 'var(--color-success)' : item.avg_score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
      }}>{item.avg_score || '—'}</span>
    )},
    { key: 'platforms', label: 'Platforms', render: (item: AdvocateInfo) => (
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {item.platforms.map(p => (
          <span key={p} style={{
            padding: '0.15rem 0.4rem', borderRadius: 'var(--radius-full)',
            background: p === 'reddit' ? 'rgba(255,69,0,0.15)' : 'rgba(0,119,181,0.15)',
            color: p === 'reddit' ? '#FF4500' : '#0077B5',
            fontSize: '0.72rem', fontWeight: 600, textTransform: 'capitalize',
          }}>{p}</span>
        ))}
      </div>
    )},
    { key: 'latest_submission', label: 'Last Active', sortable: true, render: (item: AdvocateInfo) => (
      <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
        {new Date(item.latest_submission).toLocaleDateString()}
      </span>
    )},
  ];

  if (loading) return <LoadingSkeleton lines={6} height={24} />;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={24} color="var(--color-primary)" />
          <h1>Advocates</h1>
        </div>
        <p>All advocates who have submitted to your campaigns.</p>
      </div>

      <DataTable columns={columns} data={advocates}
        emptyMessage="No advocates have submitted to your campaigns yet." />
    </div>
  );
}
