import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Network error');
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin Login · Maison Azure</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;1,300&family=Inter+Tight:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#1a1814', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Inter Tight', sans-serif", color: '#f5f1ea' }}>
        <form onSubmit={handleLogin} style={{ maxWidth: 380, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontStyle: 'italic', fontWeight: 300, marginBottom: 6 }}>Maison Azure</div>
            <div style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.6 }}>Owner Console</div>
          </div>

          {error && <div style={{ background: 'rgba(255,100,100,0.15)', border: '1px solid rgba(255,100,100,0.3)', color: '#ffaaaa', padding: 12, marginBottom: 20, fontSize: 13 }}>{error}</div>}

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8, opacity: 0.7 }}>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoFocus
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(245,241,234,0.3)', color: '#f5f1ea', padding: '8px 0', fontFamily: 'inherit', fontSize: 15, outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8, opacity: 0.7 }}>Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(245,241,234,0.3)', color: '#f5f1ea', padding: '8px 0', fontFamily: 'inherit', fontSize: 15, outline: 'none' }} />
          </div>

          <button type="submit" disabled={loading}
            style={{ width: '100%', background: '#a8854a', color: '#1a1814', border: 'none', padding: 16, fontFamily: 'inherit', fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div style={{ marginTop: 24, fontSize: 11, opacity: 0.5, textAlign: 'center', letterSpacing: '0.1em' }}>
            First time? Visit /api/setup?email=...&password=...
          </div>
        </form>
      </div>
    </>
  );
}
