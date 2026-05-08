import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AdminLogin() {
  const router = useRouter();
  const [view, setView] = useState<'login' | 'forgot' | 'sent'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); setLoading(false); return; }
      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Network error');
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await fetch('/api/admin/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      setView('sent');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    minHeight: '100vh', background: '#1a1814', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 24, fontFamily: "'Inter Tight', sans-serif", color: '#f5f1ea'
  };

  const inputStyle = {
    width: '100%', background: 'transparent', border: 'none',
    borderBottom: '1px solid rgba(245,241,234,0.3)', color: '#f5f1ea',
    padding: '8px 0', fontFamily: 'inherit', fontSize: 15, outline: 'none'
  };

  const labelStyle = {
    display: 'block', fontSize: 10, letterSpacing: '0.25em',
    textTransform: 'uppercase' as const, marginBottom: 8, opacity: 0.7
  };

  const btnStyle = (disabled: boolean) => ({
    width: '100%', background: '#a8854a', color: '#1a1814', border: 'none', padding: 16,
    fontFamily: 'inherit', fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase' as const,
    fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1
  });

  const logo = (
    <div style={{ textAlign: 'center', marginBottom: 40 }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontStyle: 'italic', fontWeight: 300, marginBottom: 6 }}>Maison Azure</div>
      <div style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.6 }}>Owner Console</div>
    </div>
  );

  const errorBox = error && (
    <div style={{ background: 'rgba(255,100,100,0.15)', border: '1px solid rgba(255,100,100,0.3)', color: '#ffaaaa', padding: 12, marginBottom: 20, fontSize: 13 }}>
      {error}
    </div>
  );

  return (
    <>
      <Head>
        <title>Admin Login · Maison Azure</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;1,300&family=Inter+Tight:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <div style={containerStyle}>

        {/* LOGIN */}
        {view === 'login' && (
          <form onSubmit={handleLogin} style={{ maxWidth: 380, width: '100%' }}>
            {logo}
            {errorBox}

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoFocus style={inputStyle} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ textAlign: 'right', marginBottom: 28 }}>
              <button type="button" onClick={() => { setError(''); setView('forgot'); }}
                style={{ background: 'none', border: 'none', color: '#a8854a', fontSize: 12, cursor: 'pointer', padding: 0, opacity: 0.8 }}>
                Forgot password?
              </button>
            </div>

            <button type="submit" disabled={loading} style={btnStyle(loading)}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div style={{ marginTop: 24, fontSize: 11, opacity: 0.4, textAlign: 'center', letterSpacing: '0.1em' }}>
              First time? Visit /api/setup?email=...&password=...
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD */}
        {view === 'forgot' && (
          <form onSubmit={handleResetRequest} style={{ maxWidth: 380, width: '100%' }}>
            {logo}
            {errorBox}

            <p style={{ fontSize: 14, opacity: 0.75, marginBottom: 28, lineHeight: 1.6 }}>
              Enter your admin email and we'll send you a reset link. It expires in 1 hour.
            </p>

            <div style={{ marginBottom: 32 }}>
              <label style={labelStyle}>Email</label>
              <input type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)} autoFocus style={inputStyle} />
            </div>

            <button type="submit" disabled={loading} style={btnStyle(loading)}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <button type="button" onClick={() => { setError(''); setView('login'); }}
                style={{ background: 'none', border: 'none', color: '#f5f1ea', fontSize: 12, cursor: 'pointer', opacity: 0.5 }}>
                ← Back to login
              </button>
            </div>
          </form>
        )}

        {/* EMAIL SENT CONFIRMATION */}
        {view === 'sent' && (
          <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
            {logo}
            <div style={{ fontSize: 36, marginBottom: 16 }}>✉</div>
            <p style={{ fontSize: 15, marginBottom: 8 }}>Check your inbox</p>
            <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 32, lineHeight: 1.6 }}>
              If <strong>{resetEmail}</strong> matches an admin account, a reset link is on its way. Check spam if it doesn't arrive within 2 minutes.
            </p>
            <button onClick={() => { setError(''); setView('login'); }}
              style={{ background: 'none', border: '1px solid rgba(245,241,234,0.2)', color: '#f5f1ea', padding: '12px 24px', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Back to Login
            </button>
          </div>
        )}

      </div>
    </>
  );
}
