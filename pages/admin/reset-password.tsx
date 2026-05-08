import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setMessage('Passwords do not match'); setStatus('error'); return; }
    if (password.length < 8) { setMessage('Password must be at least 8 characters'); setStatus('error'); return; }
    setStatus('loading');
    try {
      const res = await fetch('/api/admin/reset-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('done');
      } else {
        setMessage(data.error || 'Failed');
        setStatus('error');
      }
    } catch {
      setMessage('Network error');
      setStatus('error');
    }
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

  return (
    <>
      <Head>
        <title>Reset Password · Maison Azure</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;1,300&family=Inter+Tight:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#1a1814', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Inter Tight', sans-serif", color: '#f5f1ea' }}>
        <div style={{ maxWidth: 380, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontStyle: 'italic', fontWeight: 300, marginBottom: 6 }}>Maison Azure</div>
            <div style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.6 }}>Set New Password</div>
          </div>

          {status === 'done' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 16 }}>✓</div>
              <p style={{ marginBottom: 24, opacity: 0.8, fontSize: 14 }}>Password updated successfully.</p>
              <button onClick={() => router.push('/admin/login')}
                style={{ background: '#a8854a', color: '#1a1814', border: 'none', padding: '14px 28px', fontFamily: 'inherit', fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 500 }}>
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {status === 'error' && (
                <div style={{ background: 'rgba(255,100,100,0.15)', border: '1px solid rgba(255,100,100,0.3)', color: '#ffaaaa', padding: 12, marginBottom: 20, fontSize: 13 }}>
                  {message}
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>New Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoFocus style={inputStyle} />
              </div>

              <div style={{ marginBottom: 32 }}>
                <label style={labelStyle}>Confirm Password</label>
                <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} style={inputStyle} />
              </div>

              <button type="submit" disabled={status === 'loading'}
                style={{ width: '100%', background: '#a8854a', color: '#1a1814', border: 'none', padding: 16, fontFamily: 'inherit', fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 500, cursor: status === 'loading' ? 'not-allowed' : 'pointer', opacity: status === 'loading' ? 0.6 : 1 }}>
                {status === 'loading' ? 'Updating...' : 'Set New Password'}
              </button>

              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <a href="/admin/login" style={{ fontSize: 12, opacity: 0.5, color: '#f5f1ea', textDecoration: 'none' }}>← Back to login</a>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
