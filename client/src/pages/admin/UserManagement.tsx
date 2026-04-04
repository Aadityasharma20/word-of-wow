import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { DataTable } from '../../components/shared/DataTable';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Modal } from '../../components/shared/Modal';

export default function UserManagement() {
  const [tab, setTab] = useState<'advocates' | 'brands'>('advocates');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionUser, setActionUser] = useState<any>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/users?role=${tab === 'advocates' ? 'advocate' : 'brand'}`);
      setUsers(res.data.data || []);
    } catch { /* empty */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [tab]);

  const handleSuspend = async (userId: string, suspend: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}`, { suspended: suspend });
      fetchUsers();
      setActionUser(null);
    } catch { /* empty */ }
  };

  const advocateColumns = [
    { key: 'display_name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'trust_score', label: 'Trust Score', sortable: true, render: (item: any) => (
      <span style={{ fontWeight: 600, color: (item.trust_score || 0) >= 70 ? 'var(--color-success)' : 'var(--color-warning)' }}>
        {item.trust_score ? item.trust_score.toFixed(1) : '50.0'}
      </span>
    )},
    { key: 'total_submissions', label: 'Submissions', sortable: true, render: (item: any) => item.total_submissions || 0 },
    { key: 'fraud_flags', label: 'Fraud Flags', render: (item: any) => (
      <span style={{ color: (item.fraud_flags || 0) > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
        {item.fraud_flags || 0}
      </span>
    )},
    { key: 'suspended', label: 'Status', render: (item: any) => item.suspended ? <StatusBadge status="rejected" /> : <StatusBadge status="active" /> },
    { key: 'actions', label: 'Actions', render: (item: any) => (
      <button className={`btn btn-sm ${item.suspended ? 'btn-success' : 'btn-danger'}`}
        onClick={(e) => { e.stopPropagation(); setActionUser(item); }}>
        {item.suspended ? 'Unsuspend' : 'Suspend'}
      </button>
    )},
  ];

  const brandColumns = [
    { key: 'display_name', label: 'Name', sortable: true },
    { key: 'company_name', label: 'Company' },
    { key: 'email', label: 'Email' },
    { key: 'campaigns_count', label: 'Campaigns', sortable: true, render: (item: any) => item.campaigns_count || 0 },
    { key: 'total_submissions', label: 'Submissions', render: (item: any) => item.total_submissions || 0 },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>User Management</h1>
        <p>Manage advocates and brand accounts.</p>
      </div>

      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: 'var(--space-lg)', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        {(['advocates', 'brands'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`}
            style={{ textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      <DataTable columns={tab === 'advocates' ? advocateColumns : brandColumns} data={users}
        loading={loading} emptyMessage={`No ${tab} found.`} />

      {/* Suspend Confirmation */}
      <Modal isOpen={!!actionUser} onClose={() => setActionUser(null)} title={actionUser?.suspended ? 'Unsuspend User' : 'Suspend User'}>
        {actionUser && (
          <div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {actionUser.suspended
                ? `Are you sure you want to unsuspend ${actionUser.display_name}?`
                : `Are you sure you want to suspend ${actionUser.display_name}? They will not be able to submit.`
              }
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button className="btn btn-ghost" onClick={() => setActionUser(null)} style={{ flex: 1 }}>Cancel</button>
              <button className={`btn ${actionUser.suspended ? 'btn-success' : 'btn-danger'}`}
                onClick={() => handleSuspend(actionUser.id, !actionUser.suspended)} style={{ flex: 1 }}>
                {actionUser.suspended ? 'Unsuspend' : 'Suspend'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
