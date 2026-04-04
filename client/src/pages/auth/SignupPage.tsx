import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { User, Building2, Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
  const { signup, signInWithGoogle, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<'advocate' | 'brand'>('brand');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signup(email, password, role, displayName, role === 'brand' ? companyName : undefined);
      navigate('/');
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
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Create your account</p>
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

        {/* Step 1: Choose Role */}
        {step === 1 && (
          <>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>I am a...</p>
            <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: '1.5rem' }}>
              {([
                { value: 'advocate' as const, icon: <User size={24} />, title: 'Advocate', desc: 'Share authentic content & earn rewards' },
                { value: 'brand' as const, icon: <Building2 size={24} />, title: 'Brand', desc: 'Launch campaigns & get genuine mentions' },
              ]).map((option) => (
                <div key={option.value} onClick={() => setRole(option.value)} className="glass" style={{
                  flex: 1, padding: '1.5rem 1rem', textAlign: 'center', cursor: 'pointer',
                  transition: 'all var(--transition-base)',
                  borderColor: role === option.value ? 'var(--color-primary)' : undefined,
                  boxShadow: role === option.value ? 'var(--shadow-glow)' : undefined,
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 'var(--radius-md)', margin: '0 auto 0.75rem',
                    background: role === option.value ? 'rgba(108,92,231,0.2)' : 'var(--color-surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: role === option.value ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                  }}>
                    {option.icon}
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{option.title}</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{option.desc}</p>
                </div>
              ))}
            </div>
            <button className="btn btn-primary w-full" onClick={() => setStep(2)} style={{ padding: '0.75rem' }}>Continue</button>
          </>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <>
            <button onClick={signInWithGoogle} className="btn btn-ghost w-full" disabled={submitting}
              style={{ marginBottom: 'var(--space-md)', padding: '0.75rem', gap: '0.75rem' }}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
              Sign up with Google
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <input className="input" placeholder="Display Name" value={displayName}
                onChange={(e) => setDisplayName(e.target.value)} required />
              {role === 'brand' && (
                <input className="input" placeholder="Company Name" value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)} required />
              )}
              <input className="input" type="email" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
              <div style={{ position: 'relative' }}>
                <input className="input" type={showPwd ? 'text' : 'password'} placeholder="Password (min 8 chars)" value={password}
                  onChange={(e) => setPassword(e.target.value)} required minLength={8} style={{ paddingRight: '2.5rem' }} />
                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer',
                }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={submitting} style={{ padding: '0.75rem' }}>
                {submitting ? 'Creating...' : 'Create Account'}
              </button>
            </form>
            <button onClick={() => setStep(1)} className="btn btn-ghost btn-sm w-full" style={{ marginTop: '0.5rem' }}>
              ← Change role ({role})
            </button>
          </>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.25rem', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
          Already have an account? <Link to="/auth/login" style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
