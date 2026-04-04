import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import {
  LayoutDashboard, Megaphone, FileText, Gift, Plus, Users,
  ClipboardCheck, Shield, LogOut, Menu, X, ChevronLeft, Radar, Code,
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: Record<string, NavItem[]> = {
  advocate: [
    { path: '/advocate/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/advocate/campaigns', label: 'Campaigns', icon: <Megaphone size={20} /> },
    { path: '/advocate/submissions', label: 'My Submissions', icon: <FileText size={20} /> },
    { path: '/advocate/rewards', label: 'Rewards', icon: <Gift size={20} /> },
  ],
  brand: [
    { path: '/brand/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/brand/campaigns', label: 'My Campaigns', icon: <Megaphone size={20} /> },
    { path: '/brand/campaigns/new', label: 'Create Campaign', icon: <Plus size={20} /> },
    { path: '/brand/advocates', label: 'Advocates', icon: <Users size={20} /> },
    { path: '/brand/mentions', label: 'Brand Mentions', icon: <Radar size={20} /> },
    { path: '/brand/embed', label: 'Embed & Activate', icon: <Code size={20} /> },
  ],
  admin: [
    { path: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/admin/review', label: 'Review Queue', icon: <ClipboardCheck size={20} /> },
    { path: '/admin/submissions', label: 'Submissions', icon: <FileText size={20} /> },
    { path: '/admin/users', label: 'Users', icon: <Users size={20} /> },
    { path: '/admin/campaigns', label: 'Campaigns', icon: <Shield size={20} /> },
  ],
};

export function AppShell() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const navItems = NAV_ITEMS[user.role] || [];

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const sidebarWidth = collapsed ? 72 : 260;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 99,
        }} className="mobile-overlay" />
      )}

      {/* Sidebar */}
      <aside className="app-sidebar" style={{
        width: sidebarWidth, minHeight: '100vh', position: 'fixed', left: 0, top: 0,
        background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)',
        display: 'flex', flexDirection: 'column', transition: 'width var(--transition-base), transform var(--transition-base)',
        zIndex: 100, overflow: 'hidden',
        transform: mobileOpen ? 'translateX(0)' : undefined,
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? '1rem 0.75rem' : '1rem 1.25rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          minHeight: 'var(--header-height)',
        }}>
          <img src="/logo.png" alt="Word of Wow" style={{ height: collapsed ? 42 : 52, width: 'auto', borderRadius: 6, objectFit: 'contain' }} />
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: collapsed ? '0.65rem' : '0.65rem 0.75rem',
                borderRadius: 'var(--radius-md)', textDecoration: 'none',
                justifyContent: collapsed ? 'center' : 'flex-start',
                fontSize: '0.875rem', fontWeight: 500,
                color: isActive ? 'var(--color-text)' : 'var(--color-text-secondary)',
                background: isActive ? 'rgba(108, 92, 231, 0.15)' : 'transparent',
                transition: 'all var(--transition-fast)',
              })}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '0.75rem', borderTop: '1px solid var(--color-border)',
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
        }}>
          {!collapsed && (
            <div style={{ padding: '0 0.5rem', marginBottom: '0.25rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)' }}>{user.displayName}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{user.role}</p>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="btn btn-ghost btn-sm" style={{
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            <ChevronLeft size={16} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform var(--transition-base)' }} />
            {!collapsed && <span>Collapse</span>}
          </button>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{
            justifyContent: collapsed ? 'center' : 'flex-start',
            color: 'var(--color-danger)',
          }}>
            <LogOut size={16} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="app-main" style={{
        flex: 1, marginLeft: sidebarWidth, transition: 'margin-left var(--transition-base)',
        minHeight: '100vh',
      }}>
        {/* Top bar (mobile) */}
        <header style={{
          height: 'var(--header-height)', padding: '0 1.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg)',
        }}>
          <button onClick={() => setMobileOpen(true)} className="btn btn-ghost btn-sm mobile-menu-btn">
            <Menu size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 700, color: '#fff',
            }}>
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{user.displayName}</span>
            <span style={{
              fontSize: '0.65rem', padding: '0.15rem 0.5rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(108, 92, 231, 0.15)',
              color: 'var(--color-primary-light)',
              fontWeight: 600, textTransform: 'uppercase',
            }}>{user.role}</span>
          </div>
        </header>

        {/* Page content */}
        <div style={{ padding: '1.5rem' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
