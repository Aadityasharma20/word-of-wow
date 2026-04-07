import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login, signInWithGoogle, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(redirectTo);
    } catch { /* error set in store */ }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)', padding: '1rem',
    }}>
      <div className="glass animate-slide-up" style={{ maxWidth: 420, width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <img src="/logo.png" alt="Word of Wow" style={{ height: 112, width: 'auto', borderRadius: 8, objectFit: 'contain' }} />
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Welcome back! Sign in to continue.</p>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem', background: 'rgba(225,112,85,0.15)',
            border: '1px solid rgba(225,112,85,0.3)', borderRadius: 'var(--radius-md)',
            color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: 'var(--space-md)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            {error}
            <button onClick={clearError} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        <button onClick={signInWithGoogle} className="btn btn-ghost w-full" disabled={submitting}
          style={{ marginBottom: 'var(--space-md)', padding: '0.75rem', gap: '0.75rem' }}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <input className="input" type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
          <div style={{ position: 'relative' }}>
            <input className="input" type={showPwd ? 'text' : 'password'} placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)} required style={{ paddingRight: '2.5rem' }} />
            <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
              position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer',
            }}>
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={submitting} style={{ padding: '0.75rem' }}>
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
          Don't have an account? <Link to={`/auth/signup${redirectTo !== '/' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`} style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
