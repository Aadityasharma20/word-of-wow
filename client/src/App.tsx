import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/shared/AppShell';
import { supabase } from './lib/supabase';

// ── Lazy Page Imports ─────────────────────────────────────
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));

// Advocate pages
const AdvocateDashboard = lazy(() => import('./pages/advocate/AdvocateDashboard'));
const CampaignBrowser = lazy(() => import('./pages/advocate/CampaignBrowser'));
const CampaignDetail = lazy(() => import('./pages/advocate/CampaignDetail'));
const SubmitPage = lazy(() => import('./pages/advocate/SubmitPage'));
const SubmissionDetail = lazy(() => import('./pages/advocate/SubmissionDetail'));
const MySubmissions = lazy(() => import('./pages/advocate/MySubmissions'));
const RewardsPage = lazy(() => import('./pages/advocate/RewardsPage'));

// Brand pages
const BrandDashboard = lazy(() => import('./pages/brand/BrandDashboard'));
const CreateCampaign = lazy(() => import('./pages/brand/CreateCampaign'));
const CampaignManage = lazy(() => import('./pages/brand/CampaignManage'));
const MyCampaigns = lazy(() => import('./pages/brand/MyCampaigns'));
const AdvocatePool = lazy(() => import('./pages/brand/AdvocatePool'));
const BrandMentions = lazy(() => import('./pages/brand/BrandMentions'));
const EmbedSettings = lazy(() => import('./pages/brand/EmbedSettings'));

// Public pages
const CampaignPublicPage = lazy(() => import('./pages/CampaignPublicPage'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ReviewQueue = lazy(() => import('./pages/admin/ReviewQueue'));
const AllSubmissions = lazy(() => import('./pages/admin/AllSubmissions'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const CampaignOversight = lazy(() => import('./pages/admin/CampaignOversight'));

// ── Loading Spinner ───────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '50vh',
    }}>
      <div style={{ position: 'relative', width: 54, height: 54 }}>
        <img src="/favicon.png" alt="Loading" style={{
          width: 54, height: 54, borderRadius: '50%', position: 'relative', zIndex: 2,
        }} />
        <div style={{
          position: 'absolute', inset: -6, borderRadius: '50%',
          border: '2px solid rgba(167,139,250,0.3)',
          animation: 'wowPulse 1.5s ease-in-out infinite',
        }} />
      </div>
      <style>{`@keyframes wowPulse{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(1.15);opacity:1}}`}</style>
    </div>
  );
}

// ── Splash Screen ─────────────────────────────────────────
function SplashScreen() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--color-bg)', position: 'relative', overflow: 'hidden',
    }}>
      {/* Animated circles */}
      <div style={{ position: 'relative', width: 110, height: 110, marginBottom: '1.5rem' }}>
        {/* Outer pulsing ring 1 */}
        <div style={{
          position: 'absolute', inset: -20, borderRadius: '50%',
          border: '2px solid rgba(167,139,250,0.15)',
          animation: 'splashRing 2s ease-out infinite',
        }} />
        {/* Outer pulsing ring 2 (staggered) */}
        <div style={{
          position: 'absolute', inset: -20, borderRadius: '50%',
          border: '2px solid rgba(167,139,250,0.15)',
          animation: 'splashRing 2s ease-out 0.6s infinite',
        }} />
        {/* Outer pulsing ring 3 (staggered) */}
        <div style={{
          position: 'absolute', inset: -20, borderRadius: '50%',
          border: '2px solid rgba(167,139,250,0.1)',
          animation: 'splashRing 2s ease-out 1.2s infinite',
        }} />
        {/* Inner glow */}
        <div style={{
          position: 'absolute', inset: -8, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.2) 0%, transparent 70%)',
          animation: 'wowPulse 2s ease-in-out infinite',
        }} />
        {/* Favicon logo */}
        <img src="/favicon.png" alt="Word of Wow" style={{
          width: 110, height: 110, borderRadius: '50%', position: 'relative', zIndex: 2,
          filter: 'drop-shadow(0 0 20px rgba(167,139,250,0.4))',
        }} />
      </div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', opacity: 0.8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading</p>
      <style>{`
        @keyframes splashRing{0%{transform:scale(0.8);opacity:1}100%{transform:scale(1.8);opacity:0}}
        @keyframes wowPulse{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(1.1);opacity:1}}
      `}</style>
    </div>
  );
}

// ── Role-based redirect helper ────────────────────────────
function RoleRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/" replace />;
  const paths: Record<string, string> = {
    advocate: '/advocate/dashboard',
    brand: '/brand/dashboard',
    admin: '/admin/dashboard',
  };
  return <Navigate to={paths[user.role] || '/advocate/dashboard'} replace />;
}

// ── Main App ──────────────────────────────────────────────
function App() {
  const { checkSession, user, isLoading } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try { await checkSession(); } catch { /* continue */ }
      setReady(true);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        useAuthStore.getState().checkSession();
        return;
      }
      if (event === 'SIGNED_IN' && session) {
        // Skip if signup/login already set the user in the store
        const currentUser = useAuthStore.getState().user;
        if (currentUser) return;

        // Only auto-create profile for OAuth logins (Google).
        const isOAuth = session.user.app_metadata?.provider !== 'email';
        if (isOAuth) {
          const { data: existingProfile } = await supabase
            .from('profiles').select('id').eq('id', session.user.id).single();
          if (!existingProfile) {
            await supabase.from('profiles').insert({
              id: session.user.id, role: 'advocate',
              display_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
              email: session.user.email,
            });
            await supabase.from('advocate_profiles').insert({ id: session.user.id });
          }
        }
        await checkSession();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!ready) return <SplashScreen />;

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={user ? <RoleRedirect /> : <LandingPage />} />
          <Route path="/auth/login" element={user ? <RoleRedirect /> : <LoginPage />} />
          <Route path="/auth/signup" element={user ? <RoleRedirect /> : <SignupPage />} />

          {/* Public Campaign Page (no auth) */}
          <Route path="/campaign/:id" element={<CampaignPublicPage />} />

          {/* Advocate Routes */}
          <Route path="/advocate" element={<ProtectedRoute allowedRoles={['advocate']}><AppShell /></ProtectedRoute>}>
            <Route path="dashboard" element={<AdvocateDashboard />} />
            <Route path="campaigns" element={<CampaignBrowser />} />
            <Route path="campaigns/:id" element={<CampaignDetail />} />
            <Route path="submit/:campaignId" element={<SubmitPage />} />
            <Route path="submissions" element={<MySubmissions />} />
            <Route path="submissions/:id" element={<SubmissionDetail />} />
            <Route path="rewards" element={<RewardsPage />} />
          </Route>

          {/* Brand Routes */}
          <Route path="/brand" element={<ProtectedRoute allowedRoles={['brand']}><AppShell /></ProtectedRoute>}>
            <Route path="dashboard" element={<BrandDashboard />} />
            <Route path="campaigns" element={<MyCampaigns />} />
            <Route path="campaigns/new" element={<CreateCampaign />} />
            <Route path="campaigns/:id" element={<CampaignManage />} />
            <Route path="advocates" element={<AdvocatePool />} />
            <Route path="mentions" element={<BrandMentions />} />
            <Route path="embed" element={<EmbedSettings />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AppShell /></ProtectedRoute>}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="review" element={<ReviewQueue />} />
            <Route path="submissions" element={<AllSubmissions />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="campaigns" element={<CampaignOversight />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
