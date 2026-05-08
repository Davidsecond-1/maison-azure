// pages/admin/outreach.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface Lead {
  id: number;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  website: string | null;
  location: string | null;
  city: string;
  property_type: string;
  source: string;
  notes: string | null;
  status: string;
  email_count: number;
  last_email_at: string | null;
  email_open_count: number;
  email_last_opened_at: string | null;
  last_contacted_at: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  opened: 'Opened',
  replied: 'Replied',
  qualified: 'Qualified',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost'
};

const STATUS_COLORS: Record<string, string> = {
  new: '#60a5fa',
  contacted: '#fbbf24',
  opened: '#a78bfa',
  replied: '#4ade80',
  qualified: '#22d3ee',
  closed_won: '#a8854a',
  closed_lost: '#94a3b8'
};

const TEMPLATES = [
  { key: 'opener', label: 'Cold Opener' },
  { key: 'followup_1', label: 'Follow-up #1' },
  { key: 'followup_2', label: 'Follow-up #2 (final)' },
  { key: 'post_demo', label: 'Post-Demo Close' }
];

export default function OutreachAdmin() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeLead, setComposeLead] = useState<Lead | null>(null);
  const [composeMode, setComposeMode] = useState<'email' | 'whatsapp'>('email');
  const [composeTemplate, setComposeTemplate] = useState('opener');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');

  // Add form state
  const [newLead, setNewLead] = useState({
    business_name: '', contact_name: '', email: '', phone: '',
    instagram: '', location: '', city: 'Lagos', notes: ''
  });

  // Bulk import state
  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);

  useEffect(() => { loadLeads(); }, [filter, cityFilter, search]);

  async function loadLeads() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (cityFilter !== 'all') params.set('city', cityFilter);
      if (search) params.set('search', search);
      
      const res = await fetch(`/api/leads?${params}`);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      setLeads(data.leads || []);
      setStats(data.stats || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function addLead() {
    if (!newLead.business_name) { showToast('Business name required'); return; }
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLead)
    });
    if (res.ok) {
      showToast('Lead added');
      setNewLead({ business_name: '', contact_name: '', email: '', phone: '', instagram: '', location: '', city: 'Lagos', notes: '' });
      setShowAddForm(false);
      loadLeads();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed');
    }
  }

  async function updateStatus(id: number, status: string) {
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    loadLeads();
  }

  async function deleteLead(id: number) {
    if (!confirm('Delete this lead?')) return;
    await fetch(`/api/leads/${id}`, { method: 'DELETE' });
    loadLeads();
  }

  function parseBulk() {
    const lines = bulkText.split('\n').filter(l => l.trim());
    const parsed: any[] = [];
    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (!parts[0]) continue;
      parsed.push({
        business_name: parts[0],
        contact_name: parts[1] || '',
        email: parts[2] || '',
        phone: parts[3] || '',
        instagram: parts[4] || '',
        location: parts[5] || '',
        city: parts[6] || 'Lagos',
        source: 'import'
      });
    }
    setBulkPreview(parsed);
  }

  async function doImport() {
    if (!bulkPreview.length) { showToast('Nothing to import'); return; }
    const res = await fetch('/api/leads', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: bulkPreview })
    });
    const data = await res.json();
    showToast(`Imported ${data.imported}, skipped ${data.skipped}`);
    setBulkText('');
    setBulkPreview([]);
    setShowImport(false);
    loadLeads();
  }

  function openCompose(lead: Lead, mode: 'email' | 'whatsapp') {
    setComposeLead(lead);
    setComposeMode(mode);
    setComposeTemplate('opener');
    if (mode === 'email') {
      // Will be filled by server when sent (vars resolved server-side)
      setComposeSubject('');
      setComposeBody('');
    } else {
      setComposeBody(`Hi ${lead.contact_name || 'there'} 👋\n\nI came across ${lead.business_name} and your apartment really stands out. Quick question — do you currently take direct bookings, or only through Airbnb/Booking.com?\n\nI build private booking websites for premium ${lead.city || 'Lagos'} short-lets (Paystack, owner analytics). Happy to send a 2-min demo if you're open to it.`);
    }
    setShowCompose(true);
  }

  async function sendEmail() {
    if (!composeLead) return;
    setSending(true);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: composeLead.id,
          template_key: composeTemplate,
          subject: composeSubject || undefined,
          body: composeBody || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Email sent ✓');
        setShowCompose(false);
        loadLeads();
      } else {
        showToast(data.error || 'Failed');
      }
    } finally {
      setSending(false);
    }
  }

  function openWhatsApp() {
    if (!composeLead) return;
    const phone = (composeLead.whatsapp || composeLead.phone || '').replace(/\D/g, '');
    if (!phone) { showToast('No phone number'); return; }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(composeBody)}`;
    window.open(url, '_blank');
    
    // Mark as contacted
    fetch(`/api/leads/${composeLead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: composeLead.status === 'new' ? 'contacted' : composeLead.status })
    }).then(loadLeads);
    
    setShowCompose(false);
  }

  async function bulkSendOpener() {
    if (selectedIds.size === 0) { showToast('Select leads first'); return; }
    if (!confirm(`Send the cold opener email to ${selectedIds.size} leads? Follow-ups will be auto-scheduled.`)) return;
    
    setSending(true);
    try {
      const res = await fetch('/api/email/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_ids: Array.from(selectedIds),
          template_key: 'opener'
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Sent ${data.sent}, failed ${data.failed}, skipped ${data.skipped}`);
        setSelectedIds(new Set());
        loadLeads();
      } else {
        showToast(data.error || 'Failed');
      }
    } finally {
      setSending(false);
    }
  }

  function toggleSelect(id: number) {
    const ns = new Set(selectedIds);
    if (ns.has(id)) ns.delete(id); else ns.add(id);
    setSelectedIds(ns);
  }

  function selectAllVisible() {
    const eligibleLeads = leads.filter(l => l.email && (l.status === 'new' || l.status === 'contacted'));
    if (selectedIds.size === eligibleLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(eligibleLeads.map(l => l.id)));
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—';
    const d = new Date(iso);
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  return (
    <>
      <Head>
        <title>Outreach · Owner Console</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;1,300&family=Inter+Tight:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
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
        .nav-item { display: block; padding: 11px 14px; cursor: pointer; font-size: 13px; color: rgba(245,241,234,0.7); transition: all 0.15s; margin-bottom: 2px; letter-spacing: 0.05em; text-decoration: none; }
        .nav-item:hover { background: rgba(245,241,234,0.05); color: var(--paper); }
        .nav-item.active { background: rgba(168,133,74,0.15); color: var(--gold); }

        .main { padding: 32px 36px 80px; max-width: 1500px; }
        .page-header { display: flex; justify-content: space-between; align-items: end; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 1px solid var(--line); }
        .page-title { font-family: 'Fraunces', serif; font-size: 36px; font-weight: 300; letter-spacing: -0.02em; }
        .page-title em { font-style: italic; color: var(--gold-deep); }
        .page-subtitle { font-size: 13px; color: var(--whisper); margin-top: 4px; }
        .actions { display: flex; gap: 8px; }

        .stat-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; margin-bottom: 24px; }
        .stat-card { background: white; border: 1px solid var(--line); padding: 16px; cursor: pointer; transition: all 0.15s; }
        .stat-card:hover { border-color: var(--gold); }
        .stat-card.active { border-color: var(--gold-deep); background: var(--paper-warm); }
        .stat-label { font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--whisper); margin-bottom: 8px; font-weight: 500; }
        .stat-value { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 300; }

        .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px; flex-wrap: wrap; }
        .search-box { background: white; border: 1px solid var(--line); padding: 8px 14px; font-family: inherit; font-size: 13px; outline: none; min-width: 280px; }
        .search-box:focus { border-color: var(--gold); }

        select.filter { background: white; border: 1px solid var(--line); padding: 8px 12px; font-family: inherit; font-size: 13px; cursor: pointer; }

        .btn { background: var(--ink); color: var(--paper); border: none; padding: 9px 18px; font-family: inherit; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; transition: background 0.2s; }
        .btn:hover:not(:disabled) { background: var(--gold-deep); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary { background: white; color: var(--ink); border: 1px solid var(--line); }
        .btn-secondary:hover { background: var(--paper-warm); }
        .btn-gold { background: var(--gold); color: var(--ink); }
        .btn-gold:hover:not(:disabled) { background: var(--gold-deep); color: var(--paper); }
        .btn-icon { padding: 5px 9px; background: transparent; border: 1px solid var(--line); cursor: pointer; font-size: 11px; font-family: inherit; }
        .btn-icon:hover { border-color: var(--ink); }
        .btn-icon.email:hover { border-color: var(--gold); color: var(--gold-deep); }
        .btn-icon.wa:hover { border-color: var(--green); color: var(--green); }
        .btn-icon.del:hover { border-color: var(--red); color: var(--red); }

        .leads-table { background: white; border: 1px solid var(--line); }
        table { width: 100%; border-collapse: collapse; }
        thead th { text-align: left; padding: 10px 14px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--whisper); font-weight: 500; border-bottom: 1px solid var(--line); background: var(--paper-warm); }
        tbody td { padding: 12px 14px; border-bottom: 1px solid var(--line); font-size: 13px; vertical-align: top; }
        tbody tr:hover { background: var(--paper); }
        tbody tr.selected { background: rgba(168,133,74,0.06); }

        .biz-name { font-weight: 600; display: block; margin-bottom: 2px; }
        .biz-meta { font-size: 11.5px; color: var(--whisper); }
        .pill { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; color: white; }
        .actions-cell { display: flex; gap: 4px; }

        .checkbox { width: 16px; height: 16px; cursor: pointer; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(26,24,20,0.6); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px); }
        .modal { background: white; max-width: 700px; width: 100%; max-height: 90vh; overflow-y: auto; }
        .modal-head { padding: 22px 26px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; }
        .modal-title { font-family: 'Fraunces', serif; font-size: 24px; font-weight: 400; font-style: italic; }
        .modal-body { padding: 24px 26px; }
        .modal-foot { padding: 16px 26px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; gap: 8px; }

        .field { margin-bottom: 16px; }
        .field label { display: block; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--whisper); margin-bottom: 6px; font-weight: 500; }
        .field input, .field textarea, .field select { width: 100%; background: var(--paper); border: 1px solid var(--line); padding: 9px 12px; font-family: inherit; font-size: 13.5px; outline: none; }
        .field input:focus, .field textarea:focus, .field select:focus { border-color: var(--gold); }
        .field textarea { resize: vertical; min-height: 80px; }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .help { font-size: 11.5px; color: var(--whisper); margin-top: 4px; }

        .tab-row { display: flex; gap: 0; border-bottom: 1px solid var(--line); margin-bottom: 18px; }
        .tab { padding: 10px 16px; cursor: pointer; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; color: var(--whisper); border-bottom: 2px solid transparent; }
        .tab.active { color: var(--ink); border-bottom-color: var(--gold); }

        .template-pills { display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
        .tpl-pill { padding: 5px 12px; background: var(--paper); border: 1px solid var(--line); font-size: 11px; cursor: pointer; font-weight: 500; }
        .tpl-pill.active { background: var(--ink); color: var(--paper); border-color: var(--ink); }

        .toast { position: fixed; bottom: 24px; right: 24px; background: var(--ink); color: var(--paper); padding: 12px 20px; font-size: 13px; z-index: 200; }

        .empty { padding: 60px 20px; text-align: center; color: var(--whisper); }
      `}</style>

      <div className="layout">
        <aside className="sidebar">
          <div className="brand">Owner Console</div>
          <div className="brand-sub">Outreach</div>
          <a className="nav-item" href="/admin/dashboard">Overview</a>
          <a className="nav-item" href="/admin/dashboard">Bookings</a>
          <a className="nav-item" href="/admin/dashboard">Analytics</a>
          <a className="nav-item active" href="/admin/outreach">Outreach</a>
          <a className="nav-item" href="/admin/dashboard">Settings</a>
        </aside>

        <main className="main">
          <div className="page-header">
            <div>
              <h1 className="page-title">Sales <em>pipeline</em></h1>
              <div className="page-subtitle">{stats.total || 0} leads · click status to filter</div>
            </div>
            <div className="actions">
              <button className="btn btn-secondary" onClick={() => setShowImport(true)}>Bulk Import</button>
              <button className="btn btn-secondary" onClick={() => setShowAddForm(true)}>+ Add Lead</button>
              <button className="btn btn-gold" onClick={bulkSendOpener} disabled={selectedIds.size === 0 || sending}>
                {sending ? 'Sending...' : `Send Opener (${selectedIds.size})`}
              </button>
            </div>
          </div>

          {/* Stats / Filters */}
          <div className="stat-row">
            <div className={`stat-card ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
              <div className="stat-label">All</div>
              <div className="stat-value">{stats.total || 0}</div>
            </div>
            <div className={`stat-card ${filter === 'new' ? 'active' : ''}`} onClick={() => setFilter('new')}>
              <div className="stat-label">New</div>
              <div className="stat-value">{stats.new_count || 0}</div>
            </div>
            <div className={`stat-card ${filter === 'contacted' ? 'active' : ''}`} onClick={() => setFilter('contacted')}>
              <div className="stat-label">Contacted</div>
              <div className="stat-value">{stats.contacted || 0}</div>
            </div>
            <div className={`stat-card ${filter === 'opened' ? 'active' : ''}`} onClick={() => setFilter('opened')}>
              <div className="stat-label">Opened</div>
              <div className="stat-value">{stats.opened || 0}</div>
            </div>
            <div className={`stat-card ${filter === 'replied' ? 'active' : ''}`} onClick={() => setFilter('replied')}>
              <div className="stat-label">Replied</div>
              <div className="stat-value">{stats.replied || 0}</div>
            </div>
            <div className={`stat-card ${filter === 'qualified' ? 'active' : ''}`} onClick={() => setFilter('qualified')}>
              <div className="stat-label">Qualified</div>
              <div className="stat-value">{stats.qualified || 0}</div>
            </div>
            <div className={`stat-card ${filter === 'closed_won' ? 'active' : ''}`} onClick={() => setFilter('closed_won')}>
              <div className="stat-label">Closed</div>
              <div className="stat-value">{stats.closed_won || 0}</div>
            </div>
          </div>

          <div className="toolbar">
            <input className="search-box" placeholder="Search business, contact, email, location..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className="filter" value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
              <option value="all">All cities</option>
              <option value="Lagos">Lagos</option>
              <option value="Abuja">Abuja</option>
            </select>
          </div>

          <div className="leads-table">
            {loading ? (
              <div className="empty">Loading...</div>
            ) : leads.length === 0 ? (
              <div className="empty">
                <p style={{ marginBottom: 14, fontSize: 14 }}>No leads yet.</p>
                <button className="btn btn-secondary" onClick={() => setShowImport(true)}>Bulk Import to Get Started</button>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input type="checkbox" className="checkbox" onChange={selectAllVisible}
                        checked={selectedIds.size > 0 && selectedIds.size === leads.filter(l => l.email && (l.status === 'new' || l.status === 'contacted')).length} />
                    </th>
                    <th>Business</th>
                    <th>Location</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Engagement</th>
                    <th>Last contact</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => {
                    const canSelect = lead.email && (lead.status === 'new' || lead.status === 'contacted');
                    return (
                    <tr key={lead.id} className={selectedIds.has(lead.id) ? 'selected' : ''}>
                      <td>
                        {canSelect && (
                          <input type="checkbox" className="checkbox"
                            checked={selectedIds.has(lead.id)} onChange={() => toggleSelect(lead.id)} />
                        )}
                      </td>
                      <td>
                        <span className="biz-name">{lead.business_name}</span>
                        {lead.contact_name && <span className="biz-meta">{lead.contact_name}</span>}
                      </td>
                      <td>
                        <span className="biz-meta">{lead.location || '—'}</span><br />
                        <span className="biz-meta" style={{ fontSize: 10 }}>{lead.city}</span>
                      </td>
                      <td>
                        {lead.email && <div className="biz-meta">📧 {lead.email}</div>}
                        {(lead.whatsapp || lead.phone) && <div className="biz-meta">📱 {lead.whatsapp || lead.phone}</div>}
                        {lead.instagram && <div className="biz-meta">📸 {lead.instagram}</div>}
                      </td>
                      <td>
                        <select value={lead.status} onChange={e => updateStatus(lead.id, e.target.value)}
                          style={{ fontSize: 11, padding: '3px 6px', border: '1px solid var(--line)', cursor: 'pointer', fontFamily: 'inherit' }}>
                          {Object.keys(STATUS_LABELS).map(k => (
                            <option key={k} value={k}>{STATUS_LABELS[k]}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {lead.email_count > 0 && (
                          <div className="biz-meta">
                            {lead.email_count} email{lead.email_count > 1 ? 's' : ''}
                            {lead.email_open_count > 0 && ` · ${lead.email_open_count} open${lead.email_open_count > 1 ? 's' : ''}`}
                          </div>
                        )}
                        {lead.email_last_opened_at && <div className="biz-meta" style={{ color: 'var(--gold-deep)' }}>👁 {formatDate(lead.email_last_opened_at)}</div>}
                      </td>
                      <td><span className="biz-meta">{formatDate(lead.last_contacted_at)}</span></td>
                      <td>
                        <div className="actions-cell">
                          {lead.email && <button className="btn-icon email" onClick={() => openCompose(lead, 'email')}>Email</button>}
                          {(lead.whatsapp || lead.phone) && <button className="btn-icon wa" onClick={() => openCompose(lead, 'whatsapp')}>WA</button>}
                          <button className="btn-icon del" onClick={() => deleteLead(lead.id)}>×</button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {/* Add Lead Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">Add Lead</span>
              <button className="btn-icon" onClick={() => setShowAddForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="field"><label>Business name *</label><input value={newLead.business_name} onChange={e => setNewLead({...newLead, business_name: e.target.value})} /></div>
              <div className="field-row">
                <div className="field"><label>Contact name</label><input value={newLead.contact_name} onChange={e => setNewLead({...newLead, contact_name: e.target.value})} /></div>
                <div className="field"><label>Email</label><input type="email" value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Phone / WhatsApp</label><input value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} /></div>
                <div className="field"><label>Instagram</label><input value={newLead.instagram} onChange={e => setNewLead({...newLead, instagram: e.target.value})} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Location</label><input value={newLead.location} onChange={e => setNewLead({...newLead, location: e.target.value})} placeholder="Lekki Phase 1" /></div>
                <div className="field"><label>City</label><select value={newLead.city} onChange={e => setNewLead({...newLead, city: e.target.value})}><option>Lagos</option><option>Abuja</option></select></div>
              </div>
              <div className="field"><label>Notes</label><textarea value={newLead.notes} onChange={e => setNewLead({...newLead, notes: e.target.value})} /></div>
            </div>
            <div className="modal-foot">
              <span className="help">* required</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                <button className="btn" onClick={addLead}>Save Lead</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <div className="modal-head">
              <span className="modal-title">Bulk Import Leads</span>
              <button className="btn-icon" onClick={() => setShowImport(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="help" style={{ marginBottom: 12 }}>Paste one lead per line. CSV format:<br />
              <code style={{ background: 'var(--paper)', padding: 4 }}>business_name, contact_name, email, phone, instagram, location, city</code></p>
              <textarea value={bulkText} onChange={e => setBulkText(e.target.value)}
                placeholder={`Sapphire Residences, Mr. Adeola, info@sapphire.ng, +2348012345678, @sapphirelagos, Lekki Phase 1, Lagos
Maison Lux, Funke, hello@maisonlux.com, +2348087654321, @maisonluxng, Ikoyi, Lagos`}
                style={{ width: '100%', minHeight: 180, padding: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, border: '1px solid var(--line)', background: 'var(--paper)' }} />
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={parseBulk}>Preview</button>
                {bulkPreview.length > 0 && <span className="help" style={{ alignSelf: 'center' }}>{bulkPreview.length} leads ready to import</span>}
              </div>
              {bulkPreview.length > 0 && (
                <div style={{ marginTop: 12, maxHeight: 200, overflow: 'auto', border: '1px solid var(--line)', padding: 12, background: 'var(--paper)' }}>
                  {bulkPreview.slice(0, 10).map((p, i) => (
                    <div key={i} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px dashed var(--line)' }}>
                      <strong>{p.business_name}</strong> · {p.email || '(no email)'} · {p.location || '(no location)'}
                    </div>
                  ))}
                  {bulkPreview.length > 10 && <div style={{ fontSize: 11, marginTop: 6, color: 'var(--whisper)' }}>...and {bulkPreview.length - 10} more</div>}
                </div>
              )}
            </div>
            <div className="modal-foot">
              <span className="help">Existing emails will be skipped</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setShowImport(false)}>Cancel</button>
                <button className="btn" onClick={doImport} disabled={bulkPreview.length === 0}>Import {bulkPreview.length}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && composeLead && (
        <div className="modal-overlay" onClick={() => !sending && setShowCompose(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="modal-title">{composeLead.business_name}</span>
                <div className="help">{composeLead.contact_name || '—'} · {composeLead.location || composeLead.city}</div>
              </div>
              <button className="btn-icon" onClick={() => setShowCompose(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="tab-row">
                {composeLead.email && <div className={`tab ${composeMode === 'email' ? 'active' : ''}`} onClick={() => setComposeMode('email')}>Email</div>}
                {(composeLead.whatsapp || composeLead.phone) && <div className={`tab ${composeMode === 'whatsapp' ? 'active' : ''}`} onClick={() => { setComposeMode('whatsapp'); openCompose(composeLead, 'whatsapp'); }}>WhatsApp</div>}
              </div>

              {composeMode === 'email' ? (
                <>
                  <div className="template-pills">
                    {TEMPLATES.map(t => (
                      <div key={t.key} className={`tpl-pill ${composeTemplate === t.key ? 'active' : ''}`} onClick={() => setComposeTemplate(t.key)}>
                        {t.label}
                      </div>
                    ))}
                  </div>
                  <div className="field">
                    <label>Subject (leave blank to use template)</label>
                    <input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Auto-generated from template" />
                  </div>
                  <div className="field">
                    <label>Body (leave blank to use template — variables auto-fill server-side)</label>
                    <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} rows={10} placeholder={`Will use the "${TEMPLATES.find(t => t.key === composeTemplate)?.label}" template with this lead's variables auto-filled.`} />
                  </div>
                  <div className="help">📊 Open + click tracking enabled · 🔁 Auto follow-ups in 3 + 7 days if no reply</div>
                </>
              ) : (
                <>
                  <div className="field">
                    <label>WhatsApp message</label>
                    <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} rows={10} />
                  </div>
                  <div className="help">📱 Opens WhatsApp Web with this message pre-filled. You press Send to stay safe.</div>
                </>
              )}
            </div>
            <div className="modal-foot">
              <span className="help">{composeMode === 'email' ? `→ ${composeLead.email}` : `→ ${composeLead.whatsapp || composeLead.phone}`}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setShowCompose(false)}>Cancel</button>
                {composeMode === 'email' ? (
                  <button className="btn btn-gold" onClick={sendEmail} disabled={sending}>{sending ? 'Sending...' : 'Send Email'}</button>
                ) : (
                  <button className="btn btn-gold" onClick={openWhatsApp}>Open WhatsApp</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
