import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

type Tab = 'overview' | 'bookings' | 'analytics' | 'settings';

interface Booking {
  id: number;
  reference: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  guest_count: number;
  nights: number;
  total_amount: number;
  deposit_amount: number;
  status: string;
  payment_status: string;
  special_requests: string;
  created_at: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savedNotice, setSavedNotice] = useState('');

  // Load all data
  const loadData = async () => {
    try {
      const [bRes, aRes, sRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/analytics?days=30'),
        fetch('/api/settings')
      ]);

      if (bRes.status === 401) {
        router.push('/admin/login');
        return;
      }

      const bData = await bRes.json();
      const aData = await aRes.json();
      const sData = await sRes.json();

      setBookings(bData.bookings || []);
      setAnalytics(aData);
      setSettings(sData.settings || {});
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const updateBookingStatus = async (id: number, field: string, value: string) => {
    await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value })
    });
    loadData();
  };

  const deleteBooking = async (id: number) => {
    if (!confirm('Delete this booking? This cannot be undone.')) return;
    await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
    loadData();
  };

  const saveSettings = async () => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings })
    });
    if (res.ok) {
      setSavedNotice('Settings saved');
      setTimeout(() => setSavedNotice(''), 2500);
    }
  };

  const formatNaira = (amount: number) => '₦' + amount.toLocaleString();
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Owner Console · Maison Azure</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;1,300;1,400&family=Inter+Tight:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        :root {
          --ink: #1a1814;
          --paper: #f5f1ea;
          --paper-warm: #ebe4d6;
          --gold: #a8854a;
          --gold-deep: #7a5e2f;
          --whisper: #8a8378;
          --line: rgba(26,24,20,0.12);
          --green: #4a8c4a;
          --amber: #c4934a;
          --red: #a83a3a;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter Tight', sans-serif; background: var(--paper); color: var(--ink); }
      `}</style>

      <style jsx>{`
        .layout { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
        .sidebar { background: var(--ink); color: var(--paper); padding: 32px 20px; position: sticky; top: 0; height: 100vh; }
        .brand { font-family: 'Fraunces', serif; font-size: 22px; font-style: italic; font-weight: 300; margin-bottom: 4px; }
        .brand-sub { font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase; opacity: 0.5; margin-bottom: 40px; }
        .nav-item { display: flex; align-items: center; padding: 11px 14px; border-radius: 2px; cursor: pointer; font-size: 13px; color: rgba(245,241,234,0.7); transition: all 0.15s; margin-bottom: 2px; letter-spacing: 0.05em; }
        .nav-item:hover { background: rgba(245,241,234,0.05); color: var(--paper); }
        .nav-item.active { background: rgba(168,133,74,0.15); color: var(--gold); }
        .logout-btn { position: absolute; bottom: 24px; left: 20px; right: 20px; padding: 10px; background: transparent; border: 1px solid rgba(245,241,234,0.2); color: rgba(245,241,234,0.7); font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; font-family: inherit; }
        .logout-btn:hover { background: rgba(245,241,234,0.05); color: var(--paper); }

        .main { padding: 40px 48px; max-width: 1300px; }
        .page-header { display: flex; justify-content: space-between; align-items: end; margin-bottom: 36px; padding-bottom: 20px; border-bottom: 1px solid var(--line); }
        .page-title { font-family: 'Fraunces', serif; font-size: 38px; font-weight: 300; letter-spacing: -0.02em; }
        .page-title em { font-style: italic; color: var(--gold-deep); }
        .page-subtitle { font-size: 13px; color: var(--whisper); margin-top: 4px; }

        .stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 36px; }
        .stat-card { background: white; border: 1px solid var(--line); padding: 24px; }
        .stat-label { font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; color: var(--whisper); margin-bottom: 12px; }
        .stat-value { font-family: 'Fraunces', serif; font-size: 36px; font-weight: 300; line-height: 1; margin-bottom: 6px; }
        .stat-trend { font-size: 11px; color: var(--green); letter-spacing: 0.05em; }

        .section { background: white; border: 1px solid var(--line); margin-bottom: 24px; }
        .section-head { padding: 20px 24px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; }
        .section-title { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 400; font-style: italic; }
        .section-meta { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--whisper); }

        table { width: 100%; border-collapse: collapse; }
        thead th { text-align: left; padding: 14px 24px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: var(--whisper); font-weight: 500; border-bottom: 1px solid var(--line); }
        tbody td { padding: 16px 24px; border-bottom: 1px solid var(--line); font-size: 13.5px; }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover { background: var(--paper); }

        .ref { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--gold-deep); }
        .guest-name { font-weight: 500; }
        .guest-meta { font-size: 12px; color: var(--whisper); }

        .pill { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; }
        .pill-pending { background: rgba(196,147,74,0.15); color: var(--amber); }
        .pill-confirmed { background: rgba(74,140,74,0.15); color: var(--green); }
        .pill-cancelled { background: rgba(168,58,58,0.15); color: var(--red); }
        .pill-completed { background: rgba(168,133,74,0.15); color: var(--gold-deep); }
        .pill-unpaid { background: rgba(168,58,58,0.15); color: var(--red); }
        .pill-deposit_paid { background: rgba(196,147,74,0.15); color: var(--amber); }
        .pill-fully_paid { background: rgba(74,140,74,0.15); color: var(--green); }

        .status-select { background: transparent; border: 1px solid var(--line); padding: 4px 8px; font-size: 11px; font-family: inherit; cursor: pointer; outline: none; }

        .empty { padding: 60px 20px; text-align: center; color: var(--whisper); }
        .empty h4 { color: var(--ink); margin-bottom: 6px; font-family: 'Fraunces', serif; font-size: 22px; font-weight: 400; font-style: italic; }

        .field { margin-bottom: 20px; }
        .field label { display: block; font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; color: var(--whisper); margin-bottom: 8px; }
        .field input, .field textarea { width: 100%; background: var(--paper); border: 1px solid var(--line); padding: 10px 12px; font-family: inherit; font-size: 14px; outline: none; }
        .field input:focus, .field textarea:focus { border-color: var(--gold); }
        .field textarea { resize: vertical; min-height: 60px; }
        .field-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        .btn-primary { background: var(--ink); color: var(--paper); border: none; padding: 12px 28px; font-family: inherit; font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; cursor: pointer; }
        .btn-primary:hover { background: var(--gold-deep); }
        .btn-icon { background: transparent; border: 1px solid var(--line); padding: 4px 8px; cursor: pointer; font-size: 12px; }
        .btn-icon:hover { border-color: var(--red); color: var(--red); }

        .chart-section { padding: 24px; }
        .chart-bars { display: flex; align-items: flex-end; gap: 4px; height: 160px; padding-top: 20px; }
        .chart-bar { flex: 1; background: linear-gradient(180deg, var(--gold) 0%, var(--gold-deep) 100%); min-height: 2px; position: relative; transition: opacity 0.2s; }
        .chart-bar:hover { opacity: 0.7; }
        .chart-bar:hover::after { content: attr(data-views) ' views · ' attr(data-date); position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: var(--ink); color: var(--paper); padding: 4px 8px; font-size: 11px; white-space: nowrap; margin-bottom: 4px; }

        .source-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--line); align-items: center; }
        .source-row:last-child { border-bottom: none; }
        .source-bar-bg { flex: 1; height: 4px; background: var(--paper); margin: 0 16px; position: relative; }
        .source-bar { position: absolute; left: 0; top: 0; bottom: 0; background: var(--gold); }

        .notice { position: fixed; bottom: 24px; right: 24px; background: var(--ink); color: var(--paper); padding: 12px 20px; font-size: 12px; letter-spacing: 0.1em; }
      `}</style>

      <div className="layout">
        <aside className="sidebar">
          <div className="brand">{settings.property_name || 'Maison Azure'}</div>
          <div className="brand-sub">Owner Console</div>
          
          <div className="nav-item" style={{ background: tab === 'overview' ? 'rgba(168,133,74,0.15)' : '', color: tab === 'overview' ? 'var(--gold)' : '' }} onClick={() => setTab('overview')}>Overview</div>
          <div className="nav-item" style={{ background: tab === 'bookings' ? 'rgba(168,133,74,0.15)' : '', color: tab === 'bookings' ? 'var(--gold)' : '' }} onClick={() => setTab('bookings')}>Bookings</div>
          <div className="nav-item" style={{ background: tab === 'analytics' ? 'rgba(168,133,74,0.15)' : '', color: tab === 'analytics' ? 'var(--gold)' : '' }} onClick={() => setTab('analytics')}>Analytics</div>
          <div className="nav-item" style={{ background: tab === 'settings' ? 'rgba(168,133,74,0.15)' : '', color: tab === 'settings' ? 'var(--gold)' : '' }} onClick={() => setTab('settings')}>Settings</div>

          <button className="logout-btn" onClick={logout}>Sign Out</button>
        </aside>

        <main className="main">
          {tab === 'overview' && (
            <>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Welcome <em>back</em></h1>
                  <div className="page-subtitle">A snapshot of the last 30 days</div>
                </div>
              </div>

              <div className="stat-row">
                <div className="stat-card">
                  <div className="stat-label">Total Visitors</div>
                  <div className="stat-value">{analytics?.uniqueSessions || 0}</div>
                  <div className="stat-trend">{analytics?.totalViews || 0} page views</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Booking Inquiries</div>
                  <div className="stat-value">{analytics?.inquiries || 0}</div>
                  <div className="stat-trend">{analytics?.conversionRate || 0}% conversion</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Confirmed Bookings</div>
                  <div className="stat-value">{analytics?.confirmed || 0}</div>
                  <div className="stat-trend">Paid in full or deposit</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Revenue (Deposits)</div>
                  <div className="stat-value">{formatNaira(analytics?.revenue || 0)}</div>
                  <div className="stat-trend">Last 30 days</div>
                </div>
              </div>

              <div className="section">
                <div className="section-head">
                  <h3 className="section-title">Recent reservations</h3>
                  <span className="section-meta">{bookings.slice(0, 5).length} of {bookings.length}</span>
                </div>
                {bookings.length === 0 ? (
                  <div className="empty">
                    <h4>No bookings yet</h4>
                    <p>Reservations will appear here when guests submit the form.</p>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Guest</th>
                        <th>Stay</th>
                        <th>Total</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.slice(0, 5).map(b => (
                        <tr key={b.id}>
                          <td><span className="ref">{b.reference}</span></td>
                          <td><span className="guest-name">{b.guest_name}</span><br /><span className="guest-meta">{b.guest_email}</span></td>
                          <td>{formatDate(b.check_in)} → {formatDate(b.check_out)}<br /><span className="guest-meta">{b.nights} nights · {b.guest_count} guests</span></td>
                          <td>{formatNaira(b.total_amount)}<br /><span className="guest-meta">deposit: {formatNaira(b.deposit_amount)}</span></td>
                          <td>
                            <span className={`pill pill-${b.status}`}>{b.status}</span>
                            <br /><span className={`pill pill-${b.payment_status}`} style={{ marginTop: 4, display: 'inline-block' }}>{b.payment_status.replace('_', ' ')}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {tab === 'bookings' && (
            <>
              <div className="page-header">
                <div>
                  <h1 className="page-title">All <em>bookings</em></h1>
                  <div className="page-subtitle">{bookings.length} total reservation{bookings.length !== 1 ? 's' : ''}</div>
                </div>
              </div>

              <div className="section">
                {bookings.length === 0 ? (
                  <div className="empty"><h4>No bookings yet</h4></div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Guest</th>
                        <th>Phone</th>
                        <th>Stay</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map(b => (
                        <tr key={b.id}>
                          <td><span className="ref">{b.reference}</span><br /><span className="guest-meta">{formatDate(b.created_at)}</span></td>
                          <td><span className="guest-name">{b.guest_name}</span><br /><span className="guest-meta">{b.guest_email}</span></td>
                          <td><span className="guest-meta">{b.guest_phone}</span></td>
                          <td>{formatDate(b.check_in)} → {formatDate(b.check_out)}<br /><span className="guest-meta">{b.nights} night{b.nights !== 1 ? 's' : ''} · {b.guest_count} guest{b.guest_count !== 1 ? 's' : ''}</span></td>
                          <td>{formatNaira(b.total_amount)}<br /><span className="guest-meta">{formatNaira(b.deposit_amount)} deposit</span></td>
                          <td>
                            <select className="status-select" value={b.status} onChange={e => updateBookingStatus(b.id, 'status', e.target.value)}>
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="cancelled">Cancelled</option>
                              <option value="completed">Completed</option>
                            </select>
                          </td>
                          <td>
                            <select className="status-select" value={b.payment_status} onChange={e => updateBookingStatus(b.id, 'payment_status', e.target.value)}>
                              <option value="unpaid">Unpaid</option>
                              <option value="deposit_paid">Deposit Paid</option>
                              <option value="fully_paid">Fully Paid</option>
                              <option value="refunded">Refunded</option>
                            </select>
                          </td>
                          <td><button className="btn-icon" onClick={() => deleteBooking(b.id)}>×</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {tab === 'analytics' && (
            <>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Site <em>analytics</em></h1>
                  <div className="page-subtitle">Last 30 days of activity</div>
                </div>
              </div>

              <div className="stat-row">
                <div className="stat-card"><div className="stat-label">Page Views</div><div className="stat-value">{analytics?.totalViews || 0}</div></div>
                <div className="stat-card"><div className="stat-label">Unique Visitors</div><div className="stat-value">{analytics?.uniqueSessions || 0}</div></div>
                <div className="stat-card"><div className="stat-label">Inquiries</div><div className="stat-value">{analytics?.inquiries || 0}</div></div>
                <div className="stat-card"><div className="stat-label">Conversion</div><div className="stat-value">{analytics?.conversionRate || 0}%</div></div>
              </div>

              <div className="section">
                <div className="section-head"><h3 className="section-title">Daily traffic</h3></div>
                <div className="chart-section">
                  {analytics?.dailyViews && analytics.dailyViews.length > 0 ? (
                    <div className="chart-bars">
                      {(() => {
                        const max = Math.max(...analytics.dailyViews.map((d: any) => d.views), 1);
                        return analytics.dailyViews.map((d: any, i: number) => (
                          <div key={i} className="chart-bar"
                            style={{ height: `${(d.views / max) * 100}%` }}
                            data-views={d.views}
                            data-date={new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} />
                        ));
                      })()}
                    </div>
                  ) : (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--whisper)' }}>No traffic data yet</div>
                  )}
                </div>
              </div>

              <div className="section">
                <div className="section-head"><h3 className="section-title">Top sources</h3></div>
                <div style={{ padding: '12px 24px' }}>
                  {analytics?.referrers && analytics.referrers.length > 0 ? (() => {
                    const max = Math.max(...analytics.referrers.map((r: any) => r.visits));
                    return analytics.referrers.map((r: any, i: number) => {
                      let displayName = r.source;
                      try {
                        if (r.source && r.source !== 'Direct' && r.source.startsWith('http')) {
                          displayName = new URL(r.source).hostname.replace('www.', '');
                        }
                      } catch {}
                      return (
                        <div key={i} className="source-row">
                          <span style={{ fontSize: 13, fontWeight: 500, minWidth: 140 }}>{displayName}</span>
                          <div className="source-bar-bg"><div className="source-bar" style={{ width: `${(r.visits / max) * 100}%` }} /></div>
                          <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", minWidth: 60, textAlign: 'right' }}>{r.visits}</span>
                        </div>
                      );
                    });
                  })() : (
                    <div className="empty"><p>No referrer data yet</p></div>
                  )}
                </div>
              </div>
            </>
          )}

          {tab === 'settings' && (
            <>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Site <em>settings</em></h1>
                  <div className="page-subtitle">Edit content, rates, and contact info</div>
                </div>
                <button className="btn-primary" onClick={saveSettings}>Save Changes</button>
              </div>

              <div className="section" style={{ padding: 28 }}>
                <h3 className="section-title" style={{ marginBottom: 20 }}>Property</h3>
                <div className="field">
                  <label>Property name</label>
                  <input value={settings.property_name || ''} onChange={e => setSettings({...settings, property_name: e.target.value})} />
                </div>
                <div className="field">
                  <label>Tagline</label>
                  <input value={settings.property_tagline || ''} onChange={e => setSettings({...settings, property_tagline: e.target.value})} />
                </div>
                <div className="field">
                  <label>Location</label>
                  <input value={settings.property_location || ''} onChange={e => setSettings({...settings, property_location: e.target.value})} />
                </div>
              </div>

              <div className="section" style={{ padding: 28 }}>
                <h3 className="section-title" style={{ marginBottom: 20 }}>Pricing</h3>
                <div className="field-row-2">
                  <div className="field">
                    <label>Nightly rate (₦)</label>
                    <input type="number" value={settings.nightly_rate || ''} onChange={e => setSettings({...settings, nightly_rate: e.target.value})} />
                  </div>
                  <div className="field">
                    <label>Cleaning fee (₦)</label>
                    <input type="number" value={settings.cleaning_fee || ''} onChange={e => setSettings({...settings, cleaning_fee: e.target.value})} />
                  </div>
                </div>
                <div className="field-row-2">
                  <div className="field">
                    <label>Weekly discount (%)</label>
                    <input type="number" value={settings.weekly_discount || ''} onChange={e => setSettings({...settings, weekly_discount: e.target.value})} />
                  </div>
                  <div className="field">
                    <label>Monthly discount (%)</label>
                    <input type="number" value={settings.monthly_discount || ''} onChange={e => setSettings({...settings, monthly_discount: e.target.value})} />
                  </div>
                </div>
                <div className="field-row-2">
                  <div className="field">
                    <label>Minimum nights</label>
                    <input type="number" value={settings.min_nights || ''} onChange={e => setSettings({...settings, min_nights: e.target.value})} />
                  </div>
                  <div className="field">
                    <label>Maximum guests</label>
                    <input type="number" value={settings.max_guests || ''} onChange={e => setSettings({...settings, max_guests: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="section" style={{ padding: 28 }}>
                <h3 className="section-title" style={{ marginBottom: 20 }}>Contact</h3>
                <div className="field">
                  <label>Public phone</label>
                  <input value={settings.contact_phone || ''} onChange={e => setSettings({...settings, contact_phone: e.target.value})} />
                </div>
                <div className="field">
                  <label>Public email</label>
                  <input value={settings.contact_email || ''} onChange={e => setSettings({...settings, contact_email: e.target.value})} />
                </div>
                <div className="field">
                  <label>WhatsApp number (digits only, e.g. 2348012345678)</label>
                  <input value={settings.contact_whatsapp || ''} onChange={e => setSettings({...settings, contact_whatsapp: e.target.value})} />
                </div>
                <div className="field">
                  <label>Notification email (where bookings are sent)</label>
                  <input value={settings.owner_email || ''} onChange={e => setSettings({...settings, owner_email: e.target.value})} />
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {savedNotice && <div className="notice">{savedNotice}</div>}
    </>
  );
}
