import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { Heart, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function LoginPage() {
  const { login, emailLogin, emailRegister, devLogin, loading } = useAuth();
  const googleBtnRef = useRef(null);
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCallback,
      auto_select: false,
    });
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: 'filled_blue',
      size: 'large',
      width: 300,
      text: 'signin_with',
      shape: 'pill',
    });
  }, []);

  const handleGoogleCallback = async (response) => {
    try {
      setError('');
      await login(response.credential, 'volunteer');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'register') {
        if (!name.trim()) return setError('Name is required');
        await emailRegister(email, password, name);
      } else {
        await emailLogin(email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="vol-login" style={{ padding: '24px' }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '50%',
        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '20px', boxShadow: '0 8px 32px rgba(59,130,246,0.3)'
      }}>
        <Heart size={32} color="#fff" />
      </div>
      <h1>SevaSetu</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', maxWidth: '280px', fontSize: '13px' }}>
        Join the volunteer network. Get matched to community needs in real-time.
      </p>

      {/* Google Sign-In */}
      {GOOGLE_CLIENT_ID && (
        <>
          <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '0 0 16px', color: 'var(--text-muted)', fontSize: '12px', width: '100%', maxWidth: '300px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            or
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          </div>
        </>
      )}

      {/* Toggle */}
      <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '10px', padding: '3px', marginBottom: '16px', width: '100%', maxWidth: '300px', border: '1px solid var(--border-color)' }}>
        <button onClick={() => { setMode('login'); setError(''); }} style={{
          flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          background: mode === 'login' ? 'var(--accent)' : 'transparent',
          color: mode === 'login' ? '#fff' : 'var(--text-muted)', transition: 'all 0.2s'
        }}>Login</button>
        <button onClick={() => { setMode('register'); setError(''); }} style={{
          flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          background: mode === 'register' ? 'var(--accent)' : 'transparent',
          color: mode === 'register' ? '#fff' : 'var(--text-muted)', transition: 'all 0.2s'
        }}>Sign Up</button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px' }}>
        {mode === 'register' && (
          <div style={{ position: 'relative' }}>
            <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)}
              style={{ width: '100%', padding: '12px 12px 12px 38px', background: 'var(--bg-input)', border: '1.5px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit' }} />
          </div>
        )}
        <div style={{ position: 'relative' }}>
          <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required
            style={{ width: '100%', padding: '12px 12px 12px 38px', background: 'var(--bg-input)', border: '1.5px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit' }} />
        </div>
        <div style={{ position: 'relative' }}>
          <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type={showPw ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
            style={{ width: '100%', padding: '12px 40px 12px 38px', background: 'var(--bg-input)', border: '1.5px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit' }} />
          <button type="button" onClick={() => setShowPw(!showPw)}
            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '12px' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="vol-btn primary" style={{ maxWidth: '100%' }}>
          {loading ? 'Please wait...' : mode === 'register' ? 'Create Account' : 'Sign In'}
        </button>
      </form>

      <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>
        Secured with JWT + bcrypt encryption
      </div>
    </div>
  );
}
