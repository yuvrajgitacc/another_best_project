import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../App';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const HAS_GOOGLE = Boolean(GOOGLE_CLIENT_ID);

export default function LoginPage() {
  const { login, devLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError('');
    try {
      // credentialResponse.credential is a Google ID token (JWT) — exactly what the backend expects
      await login(credentialResponse.credential, 'volunteer');
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled or failed. Please try again.');
  };

  return (
    <div className="vol-login">
      <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🤝</div>
      <h1>SevaSetu</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '280px' }}>
        Join the volunteer network. Get matched to community needs in real-time.
      </p>

      {loading && (
        <div className="vol-loading">
          <div className="vol-spinner" />
          Signing in…
        </div>
      )}

      {!loading && HAS_GOOGLE && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="filled_blue"
            shape="pill"
            size="large"
            text="signin_with"
            useOneTap
          />
        </div>
      )}

      {!loading && !HAS_GOOGLE && (
        <button
          type="button"
          className="vol-btn primary"
          onClick={devLogin}
          style={{ maxWidth: '300px' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: '4px' }}>
            <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="white" d="M5.84 14.09a6.98 6.98 0 010-4.18V7.07H2.18a11 11 0 000 9.86l3.66-2.84z"/>
            <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
          Continue (Dev Mode)
        </button>
      )}

      {error && (
        <p style={{ color: 'var(--accent-red)', marginTop: '16px', fontSize: '13px', maxWidth: '280px' }}>
          ⚠️ {error}
        </p>
      )}

      {!HAS_GOOGLE && (
        <p style={{ color: 'var(--text-muted)', marginTop: '20px', fontSize: '11px', maxWidth: '260px', lineHeight: 1.6 }}>
          Dev mode active. To enable real Google sign-in, add{' '}
          <code style={{ color: 'var(--accent-amber)', fontFamily: 'monospace' }}>VITE_GOOGLE_CLIENT_ID=your-id</code>{' '}
          to <code style={{ color: 'var(--accent-amber)', fontFamily: 'monospace' }}>volunteer-app/.env</code>
        </p>
      )}
    </div>
  );
}
