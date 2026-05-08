import { useEffect, useState } from 'react';
import Head from 'next/head';

// Real Unsplash photos - high quality, free for commercial use
const PHOTOS = {
  hero: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=2400&q=85',
  living: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=85',
  bedroom: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85',
  terrace: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85',
  bathroom: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1000&q=85',
  pool: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1600&q=85',
  kitchen: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=85',
  dining: 'https://images.unsplash.com/photo-1604578762246-41134e37f9cc?auto=format&fit=crop&w=1200&q=85'
};

interface Settings {
  property_name: string;
  property_tagline: string;
  property_location: string;
  nightly_rate: string;
  cleaning_fee: string;
  weekly_discount: string;
  monthly_discount: string;
  min_nights: string;
  max_guests: string;
  contact_phone: string;
  contact_email: string;
  contact_whatsapp: string;
}

export default function Home() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [unavailable, setUnavailable] = useState<any[]>([]);
  const [bookingForm, setBookingForm] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    check_in: '',
    check_out: '',
    guest_count: '2',
    special_requests: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [liveCount, setLiveCount] = useState(3);
  const [showAnalyticsDemo, setShowAnalyticsDemo] = useState(false);

  // Generate session ID for analytics
  useEffect(() => {
    let sid = sessionStorage.getItem('ma_session');
    if (!sid) {
      sid = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      sessionStorage.setItem('ma_session', sid);
    }
    
    // Track page view
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'page_view',
        session_id: sid,
        page: '/',
        referrer: document.referrer
      })
    }).catch(() => {});
  }, []);

  // Load settings
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => setSettings(d.settings))
      .catch(() => {});
    
    // Load unavailable dates
    fetch('/api/availability')
      .then(r => r.json())
      .then(d => setUnavailable(d.unavailable || []))
      .catch(() => {});

    // Default dates
    const tomorrow = new Date(Date.now() + 86400000);
    const dayAfter = new Date(Date.now() + 86400000 * 3);
    setBookingForm(prev => ({
      ...prev,
      check_in: tomorrow.toISOString().split('T')[0],
      check_out: dayAfter.toISOString().split('T')[0]
    }));
  }, []);

  // Simulate live viewers (in production, use real WebSocket)
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount(2 + Math.floor(Math.random() * 5));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Calculate total
  const calculateTotal = () => {
    if (!settings || !bookingForm.check_in || !bookingForm.check_out) return { nights: 0, total: 0 };
    const inDate = new Date(bookingForm.check_in);
    const outDate = new Date(bookingForm.check_out);
    const nights = Math.max(0, Math.ceil((outDate.getTime() - inDate.getTime()) / 86400000));
    
    let rate = parseInt(settings.nightly_rate);
    const weeklyDisc = parseInt(settings.weekly_discount);
    const monthlyDisc = parseInt(settings.monthly_discount);
    
    if (nights >= 30) rate = rate * (1 - monthlyDisc / 100);
    else if (nights >= 7) rate = rate * (1 - weeklyDisc / 100);
    
    const total = Math.round(nights * rate) + parseInt(settings.cleaning_fee);
    return { nights, total };
  };

  const { nights, total } = calculateTotal();
  const deposit = Math.round(total / 2);

  // Submit booking
  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionStorage.getItem('ma_session') || ''
        },
        body: JSON.stringify({
          ...bookingForm,
          guest_count: parseInt(bookingForm.guest_count)
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Booking failed');
        setSubmitting(false);
        return;
      }

      // Initialize Paystack
      const payRes = await fetch('/api/paystack/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: data.reference })
      });

      const payData = await payRes.json();

      if (!payRes.ok) {
        setError(payData.error || 'Payment initialization failed');
        setSubmitting(false);
        return;
      }

      // Redirect to Paystack
      window.location.href = payData.authorization_url;
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setSubmitting(false);
    }
  };

  const formatNaira = (amount: number) => '₦' + amount.toLocaleString();

  if (!settings) {
    return (
      <div style={{ background: '#f5f1ea', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'serif' }}>
        Loading...
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{settings.property_name} — Luxury Short-Let Residence</title>
        <meta name="description" content={`${settings.property_tagline}. ${settings.property_location}.`} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300&family=Inter+Tight:wght@300;400;500;600&display=swap" rel="stylesheet" />
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
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
          font-family: 'Inter Tight', sans-serif;
          background: var(--paper);
          color: var(--ink);
          line-height: 1.5;
          font-weight: 300;
          overflow-x: hidden;
        }
        body::before {
          content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 1;
          opacity: 0.4; mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.6 0 0 0 0 0.55 0 0 0 0 0.45 0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgba(106,191,105,0.5); } 50% { opacity: 0.7; box-shadow: 0 0 0 8px rgba(106,191,105,0); } }
      `}</style>

      <style jsx>{`
        nav {
          position: fixed; top: 0; left: 0; right: 0; padding: 28px 56px;
          display: flex; justify-content: space-between; align-items: center;
          z-index: 100; mix-blend-mode: difference; color: #f5f1ea;
        }
        .brand { font-family: 'Fraunces', serif; font-size: 22px; font-style: italic; letter-spacing: 0.02em; }
        .brand sup { font-style: normal; font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase; margin-left: 4px; vertical-align: super; }
        .nav-links { display: flex; gap: 40px; list-style: none; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; }
        .nav-links a { color: inherit; text-decoration: none; padding-bottom: 2px; transition: opacity 0.3s; }
        .nav-links a:hover { opacity: 0.6; }
        .reserve-btn {
          padding: 8px 18px; border: 1px solid #f5f1ea; color: inherit;
          font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; text-decoration: none;
        }

        .hero { height: 100vh; min-height: 720px; position: relative; overflow: hidden; }
        .hero-image {
          position: absolute; inset: 0;
          background-image: linear-gradient(180deg, rgba(15,20,25,0.45) 0%, rgba(15,20,25,0.65) 100%), url('${PHOTOS.hero}');
          background-size: cover; background-position: center;
        }
        .hero-content {
          position: relative; z-index: 2; height: 100%;
          display: grid; grid-template-columns: 1fr 1fr; align-items: end;
          padding: 0 56px 80px; color: var(--paper);
        }
        .hero-eyebrow {
          font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase;
          margin-bottom: 24px; opacity: 0.75; display: flex; align-items: center; gap: 12px;
          animation: fadeUp 1s ease-out 0.2s both;
        }
        .hero-eyebrow::before { content: ''; width: 30px; height: 1px; background: var(--gold); }
        .hero h1 {
          font-family: 'Fraunces', serif; font-size: clamp(56px, 9vw, 132px);
          font-weight: 300; line-height: 0.95; letter-spacing: -0.02em;
          animation: fadeUp 1.2s ease-out 0.4s both;
        }
        .hero h1 em { font-style: italic; color: var(--gold); }
        .hero-meta { text-align: right; font-size: 13px; animation: fadeUp 1s ease-out 0.6s both; }
        .hero-meta .label { font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; opacity: 0.6; margin-bottom: 6px; }
        .hero-meta .value { font-family: 'Fraunces', serif; font-size: 22px; margin-bottom: 24px; }

        .intro {
          padding: 140px 56px; max-width: 1400px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr 2fr; gap: 80px; align-items: start;
        }
        .intro-label { font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--whisper); padding-top: 12px; border-top: 1px solid var(--line); }
        .intro-text { font-family: 'Fraunces', serif; font-size: clamp(28px, 3vw, 42px); font-weight: 300; line-height: 1.25; letter-spacing: -0.01em; }
        .intro-text em { font-style: italic; color: var(--gold-deep); }

        .gallery { padding: 80px 56px 140px; max-width: 1400px; margin: 0 auto; }
        .gallery-grid { display: grid; grid-template-columns: repeat(12, 1fr); grid-auto-rows: 110px; gap: 16px; }
        .tile { border-radius: 2px; overflow: hidden; position: relative; cursor: pointer; transition: transform 0.6s cubic-bezier(0.16,1,0.3,1); background-size: cover; background-position: center; }
        .tile:hover { transform: scale(0.98); }
        .tile::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.5)); pointer-events: none; }
        .tile-1 { grid-column: span 7; grid-row: span 5; background-image: url('${PHOTOS.living}'); }
        .tile-2 { grid-column: span 5; grid-row: span 3; background-image: url('${PHOTOS.bedroom}'); }
        .tile-3 { grid-column: span 5; grid-row: span 2; background-image: url('${PHOTOS.bathroom}'); }
        .tile-4 { grid-column: span 4; grid-row: span 4; background-image: url('${PHOTOS.kitchen}'); }
        .tile-5 { grid-column: span 8; grid-row: span 4; background-image: url('${PHOTOS.pool}'); }
        .tile-num { position: absolute; top: 16px; left: 16px; font-size: 10px; letter-spacing: 0.2em; color: var(--paper); opacity: 0.85; z-index: 2; }
        .tile-label { position: absolute; bottom: 20px; left: 20px; font-family: 'Fraunces', serif; font-size: 18px; font-style: italic; color: var(--paper); z-index: 2; }

        .features { background: var(--paper-warm); padding: 140px 56px; }
        .features-inner { max-width: 1400px; margin: 0 auto; }
        .section-header { display: grid; grid-template-columns: 1fr auto; align-items: end; margin-bottom: 80px; padding-bottom: 24px; border-bottom: 1px solid var(--line); }
        .section-title { font-family: 'Fraunces', serif; font-size: clamp(40px, 5vw, 72px); font-weight: 300; line-height: 1; letter-spacing: -0.02em; }
        .section-title em { font-style: italic; color: var(--gold-deep); }
        .section-num { font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--whisper); }
        .feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 60px; }
        .feature-icon { width: 48px; height: 48px; border: 1px solid var(--gold); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 28px; font-family: 'Fraunces', serif; font-style: italic; font-size: 20px; color: var(--gold-deep); }
        .feature h3 { font-family: 'Fraunces', serif; font-size: 24px; font-weight: 400; margin-bottom: 12px; letter-spacing: -0.01em; }
        .feature p { font-size: 14px; color: var(--whisper); line-height: 1.7; }

        .booking { padding: 140px 56px; max-width: 1400px; margin: 0 auto; }
        .booking-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 100px; align-items: start; }
        .booking-info h2 { font-family: 'Fraunces', serif; font-size: clamp(40px, 5vw, 64px); font-weight: 300; line-height: 1; letter-spacing: -0.02em; margin-bottom: 32px; }
        .booking-info h2 em { font-style: italic; color: var(--gold-deep); }
        .booking-info p { font-size: 16px; line-height: 1.7; color: var(--whisper); margin-bottom: 40px; max-width: 420px; }
        .rate-card { border: 1px solid var(--line); padding: 32px; background: var(--paper); margin-bottom: 32px; }
        .rate-row { display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid var(--line); font-size: 14px; }
        .rate-row:last-child { border-bottom: none; padding-bottom: 0; }
        .rate-row:first-child { padding-top: 0; }
        .rate-row .price { font-family: 'Fraunces', serif; font-size: 18px; }

        .booking-form { background: var(--ink); color: var(--paper); padding: 48px 40px; position: relative; }
        .booking-form::before { content: ''; position: absolute; top: 16px; left: 16px; right: 16px; bottom: 16px; border: 1px solid rgba(245,241,234,0.15); pointer-events: none; }
        .form-eyebrow { font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; opacity: 0.6; margin-bottom: 12px; }
        .form-title { font-family: 'Fraunces', serif; font-size: 28px; margin-bottom: 36px; font-style: italic; }
        .field { margin-bottom: 24px; }
        .field label { display: block; font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; margin-bottom: 8px; opacity: 0.7; }
        .field input, .field select, .field textarea {
          width: 100%; background: transparent; border: none;
          border-bottom: 1px solid rgba(245,241,234,0.3);
          color: var(--paper); padding: 8px 0;
          font-family: 'Inter Tight', sans-serif; font-size: 15px; outline: none; transition: border-color 0.3s;
        }
        .field textarea { resize: vertical; min-height: 60px; }
        .field input:focus, .field select:focus, .field textarea:focus { border-bottom-color: var(--gold); }
        .field select option { background: var(--ink); color: var(--paper); }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .total-row { display: flex; justify-content: space-between; align-items: baseline; padding-top: 24px; margin-top: 24px; border-top: 1px solid rgba(245,241,234,0.2); margin-bottom: 12px; }
        .total-label { font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; opacity: 0.7; }
        .total-amount { font-family: 'Fraunces', serif; font-size: 32px; }
        .deposit-note { font-size: 12px; opacity: 0.7; margin-bottom: 24px; }
        .btn-primary {
          width: 100%; background: var(--gold); color: var(--ink); border: none;
          padding: 18px; font-family: 'Inter Tight', sans-serif;
          font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase;
          font-weight: 500; cursor: pointer; transition: all 0.3s;
        }
        .btn-primary:hover:not(:disabled) { background: var(--paper); letter-spacing: 0.35em; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .error-msg { background: rgba(255,100,100,0.15); border: 1px solid rgba(255,100,100,0.3); color: #ffaaaa; padding: 12px; margin-bottom: 16px; font-size: 13px; }

        .testimonial { padding: 140px 56px; background: var(--ink); color: var(--paper); text-align: center; }
        .testimonial-quote { font-family: 'Fraunces', serif; font-size: clamp(28px, 3.5vw, 48px); font-weight: 300; font-style: italic; line-height: 1.3; max-width: 900px; margin: 0 auto 40px; letter-spacing: -0.01em; }
        .testimonial-quote::before, .testimonial-quote::after { content: '"'; color: var(--gold); }
        .testimonial-attr { font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; opacity: 0.6; }

        footer { background: var(--paper-warm); padding: 80px 56px 40px; }
        .footer-inner { max-width: 1400px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 60px; padding-bottom: 60px; border-bottom: 1px solid var(--line); }
        .footer-brand { font-family: 'Fraunces', serif; font-size: 32px; font-style: italic; font-weight: 300; margin-bottom: 16px; }
        .footer-tagline { font-size: 14px; color: var(--whisper); max-width: 280px; line-height: 1.6; }
        .footer-col h4 { font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; margin-bottom: 20px; font-weight: 500; }
        .footer-col ul { list-style: none; font-size: 14px; }
        .footer-col li { margin-bottom: 10px; color: var(--whisper); }
        .footer-col a { color: inherit; text-decoration: none; }
        .footer-col a:hover { color: var(--ink); }
        .footer-bottom { display: flex; justify-content: space-between; padding-top: 30px; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--whisper); }

        .analytics-badge {
          position: fixed; bottom: 24px; right: 24px;
          background: var(--ink); color: var(--paper);
          padding: 14px 18px; border-radius: 2px; font-size: 11px; letter-spacing: 0.1em;
          z-index: 50; display: flex; align-items: center; gap: 10px; cursor: pointer;
          box-shadow: 0 20px 60px rgba(26,24,20,0.18); transition: transform 0.3s;
        }
        .analytics-badge:hover { transform: translateY(-2px); }
        .live-dot { width: 8px; height: 8px; background: #6abf69; border-radius: 50%; animation: pulse 2s ease-in-out infinite; }

        .modal { position: fixed; inset: 0; background: rgba(26,24,20,0.85); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); padding: 20px; }
        .modal-content { background: var(--paper); padding: 50px 40px; max-width: 560px; width: 100%; text-align: left; position: relative; max-height: 90vh; overflow-y: auto; }
        .modal-content::before { content: ''; position: absolute; inset: 14px; border: 1px solid var(--line); pointer-events: none; }
        .modal h3 { font-family: 'Fraunces', serif; font-size: 30px; font-weight: 300; font-style: italic; margin-bottom: 16px; color: var(--gold-deep); text-align: center; }
        .modal p { font-size: 13.5px; color: var(--whisper); margin-bottom: 16px; line-height: 1.6; text-align: center; }
        .modal-close { background: var(--ink); color: var(--paper); border: none; padding: 14px 32px; font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; cursor: pointer; display: block; margin: 24px auto 0; }
        .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 20px 0; }
        .stat-cell { padding: 18px; border: 1px solid var(--line); }
        .stat-cell .label { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--whisper); margin-bottom: 6px; }
        .stat-cell .value { font-family: 'Fraunces', serif; font-size: 28px; }

        @media (max-width: 768px) {
          nav { padding: 18px 20px; }
          .nav-links { display: none; }
          .hero-content { grid-template-columns: 1fr; padding: 0 20px 60px; }
          .hero-meta { text-align: left; margin-top: 30px; }
          .intro, .gallery, .features, .booking, .testimonial { padding-left: 20px; padding-right: 20px; }
          .intro { grid-template-columns: 1fr; gap: 30px; padding: 80px 20px; }
          .gallery-grid { grid-template-columns: repeat(6, 1fr); grid-auto-rows: 80px; gap: 8px; }
          .tile-1 { grid-column: span 6; grid-row: span 4; }
          .tile-2 { grid-column: span 3; grid-row: span 3; }
          .tile-3 { grid-column: span 3; grid-row: span 3; }
          .tile-4 { grid-column: span 3; grid-row: span 3; }
          .tile-5 { grid-column: span 6; grid-row: span 3; }
          .feature-grid { grid-template-columns: 1fr; gap: 40px; }
          .booking-grid { grid-template-columns: 1fr; gap: 40px; }
          .footer-inner { grid-template-columns: 1fr; gap: 40px; }
          .field-row { grid-template-columns: 1fr; }
          .booking-form { padding: 32px 24px; }
        }
      `}</style>

      <nav>
        <div className="brand">{settings.property_name}<sup>est. 2024</sup></div>
        <ul className="nav-links">
          <li><a href="#residence">The Residence</a></li>
          <li><a href="#gallery">Gallery</a></li>
          <li><a href="#features">Amenities</a></li>
          <li><a href="#booking" className="reserve-btn">Reserve</a></li>
        </ul>
      </nav>

      <section className="hero">
        <div className="hero-image"></div>
        <div className="hero-content">
          <div>
            <div className="hero-eyebrow">{settings.property_location}</div>
            <h1>An <em>intimate</em><br />residence on<br />the lagoon.</h1>
          </div>
          <div className="hero-meta">
            <div className="label">From</div>
            <div className="value">{formatNaira(parseInt(settings.nightly_rate))} / night</div>
            <div className="label">Sleeps {settings.max_guests}</div>
          </div>
        </div>
      </section>

      <section className="intro" id="residence">
        <div className="intro-label">— A Note from the House</div>
        <div className="intro-text">
          Three bedrooms, four hundred square metres, and a view that changes with the hour. {settings.property_name} is a private residence — <em>not a hotel</em> — kept for travellers who prefer their evenings quiet and their mornings unhurried.
        </div>
      </section>

      <section className="gallery" id="gallery">
        <div className="section-header">
          <h2 className="section-title">Within these <em>walls</em></h2>
          <span className="section-num">01 / Gallery</span>
        </div>
        <div className="gallery-grid">
          <div className="tile tile-1"><span className="tile-num">001</span><span className="tile-label">The Living Hall</span></div>
          <div className="tile tile-2"><span className="tile-num">002</span><span className="tile-label">Master Suite</span></div>
          <div className="tile tile-3"><span className="tile-num">003</span><span className="tile-label">Atelier Bath</span></div>
          <div className="tile tile-4"><span className="tile-num">004</span><span className="tile-label">The Kitchen</span></div>
          <div className="tile tile-5"><span className="tile-num">005</span><span className="tile-label">Lagoon-Side Pool</span></div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="features-inner">
          <div className="section-header">
            <h2 className="section-title">Considered <em>amenities</em></h2>
            <span className="section-num">02 / The Residence</span>
          </div>
          <div className="feature-grid">
            <div className="feature">
              <div className="feature-icon">i</div>
              <h3>Private Chef Service</h3>
              <p>An in-house chef on request, with a curated menu of West African fine dining and continental classics. 48 hours notice.</p>
            </div>
            <div className="feature">
              <div className="feature-icon">ii</div>
              <h3>Concierge & Driver</h3>
              <p>A dedicated concierge available throughout your stay. Black SUV with chauffeur for the duration of your reservation.</p>
            </div>
            <div className="feature">
              <div className="feature-icon">iii</div>
              <h3>Lagoon-Side Pool</h3>
              <p>Heated infinity pool overlooking the water. Private cabana, daily towel service, and a small library of lagoon-side reading.</p>
            </div>
            <div className="feature">
              <div className="feature-icon">iv</div>
              <h3>24/7 Power & Security</h3>
              <p>Uninterrupted electricity from a dedicated generator and inverter system. Estate security with biometric entry.</p>
            </div>
            <div className="feature">
              <div className="feature-icon">v</div>
              <h3>Wellness Suite</h3>
              <p>A small but considered wellness space — Peloton, free weights, and on-call masseuse from a partner spa in Ikoyi.</p>
            </div>
            <div className="feature">
              <div className="feature-icon">vi</div>
              <h3>Arrival Service</h3>
              <p>Airport pickup in a black Mercedes. Cold towels, sparkling water, and a small welcome from the house on arrival.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="booking" id="booking">
        <div className="booking-grid">
          <div className="booking-info">
            <h2>Reserve <em>your stay</em></h2>
            <p>Pay your 50% deposit instantly and securely via Paystack. The balance is payable on arrival. Confirmation is automatic.</p>
            <div className="rate-card">
              <div className="rate-row"><span>Nightly rate</span><span className="price">{formatNaira(parseInt(settings.nightly_rate))}</span></div>
              <div className="rate-row"><span>Weekly rate ({settings.weekly_discount}% off)</span><span className="price">{formatNaira(Math.round(parseInt(settings.nightly_rate) * 7 * (1 - parseInt(settings.weekly_discount)/100)))}</span></div>
              <div className="rate-row"><span>Monthly rate ({settings.monthly_discount}% off)</span><span className="price">{formatNaira(Math.round(parseInt(settings.nightly_rate) * 30 * (1 - parseInt(settings.monthly_discount)/100)))}</span></div>
              <div className="rate-row"><span>Cleaning fee</span><span className="price">{formatNaira(parseInt(settings.cleaning_fee))}</span></div>
            </div>
            <p style={{ fontSize: 13 }}>Minimum stay {settings.min_nights} nights. Maximum {settings.max_guests} guests. Payment secured by Paystack.</p>
          </div>

          <form className="booking-form" onSubmit={submitBooking}>
            <div className="form-eyebrow">Reservation</div>
            <div className="form-title">Begin your stay</div>
            
            {error && <div className="error-msg">{error}</div>}
            
            <div className="field">
              <label>Full name</label>
              <input type="text" required value={bookingForm.guest_name} onChange={e => setBookingForm({...bookingForm, guest_name: e.target.value})} placeholder="As on identification" />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" required value={bookingForm.guest_email} onChange={e => setBookingForm({...bookingForm, guest_email: e.target.value})} placeholder="you@example.com" />
            </div>
            <div className="field">
              <label>Phone (WhatsApp)</label>
              <input type="tel" required value={bookingForm.guest_phone} onChange={e => setBookingForm({...bookingForm, guest_phone: e.target.value})} placeholder="+234..." />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Arrival</label>
                <input type="date" required value={bookingForm.check_in} onChange={e => setBookingForm({...bookingForm, check_in: e.target.value})} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="field">
                <label>Departure</label>
                <input type="date" required value={bookingForm.check_out} onChange={e => setBookingForm({...bookingForm, check_out: e.target.value})} min={bookingForm.check_in} />
              </div>
            </div>
            <div className="field">
              <label>Guests</label>
              <select value={bookingForm.guest_count} onChange={e => setBookingForm({...bookingForm, guest_count: e.target.value})}>
                {Array.from({length: parseInt(settings.max_guests)}, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Special requests (optional)</label>
              <textarea value={bookingForm.special_requests} onChange={e => setBookingForm({...bookingForm, special_requests: e.target.value})} placeholder="Dietary preferences, arrival time, occasions..." />
            </div>

            <div className="total-row">
              <div className="total-label">Total · {nights} night{nights !== 1 ? 's' : ''}</div>
              <div className="total-amount">{formatNaira(total)}</div>
            </div>
            <div className="deposit-note">50% deposit due now: <strong>{formatNaira(deposit)}</strong></div>

            <button type="submit" className="btn-primary" disabled={submitting || nights < parseInt(settings.min_nights)}>
              {submitting ? 'Processing...' : `Reserve · Pay ${formatNaira(deposit)} via Paystack`}
            </button>
          </form>
        </div>
      </section>

      <section className="testimonial">
        <div className="testimonial-quote">
          Of the dozen short-lets I've stayed in around Lagos, this is the only one that felt designed for someone — not just decorated.
        </div>
        <div className="testimonial-attr">— A. Okafor · Returning Guest · 2024</div>
      </section>

      <footer>
        <div className="footer-inner">
          <div>
            <div className="footer-brand">{settings.property_name}</div>
            <p className="footer-tagline">{settings.property_tagline}. Bookings by appointment and online reservation.</p>
          </div>
          <div className="footer-col">
            <h4>The House</h4>
            <ul>
              <li><a href="#residence">Residence</a></li>
              <li><a href="#gallery">Gallery</a></li>
              <li><a href="#features">Amenities</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Reserve</h4>
            <ul>
              <li><a href="#booking">Book Online</a></li>
              <li><a href={`https://wa.me/${settings.contact_whatsapp}`}>WhatsApp Concierge</a></li>
              <li><a href={`mailto:${settings.contact_email}`}>Email</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <ul>
              <li>{settings.contact_phone}</li>
              <li>{settings.contact_email}</li>
              <li><a href={`https://wa.me/${settings.contact_whatsapp}`}>WhatsApp</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div>© 2024 {settings.property_name} · Lagos</div>
          <div>Site by Your Agency</div>
        </div>
      </footer>

      <div className="analytics-badge" onClick={() => setShowAnalyticsDemo(true)}>
        <div className="live-dot"></div>
        <span>{liveCount} viewing now</span>
      </div>

      {showAnalyticsDemo && (
        <div className="modal" onClick={() => setShowAnalyticsDemo(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Owner Analytics Dashboard</h3>
            <p>Every visit is tracked privately. Your owner dashboard shows real-time data. <em style={{ color: 'var(--gold-deep)' }}>This is just a teaser:</em></p>
            <div className="stat-grid">
              <div className="stat-cell"><div className="label">Visitors today</div><div className="value">147</div></div>
              <div className="stat-cell"><div className="label">Booking inquiries</div><div className="value">12</div></div>
              <div className="stat-cell"><div className="label">Avg time on site</div><div className="value">3:42</div></div>
              <div className="stat-cell"><div className="label">Conversion rate</div><div className="value">8.2%</div></div>
            </div>
            <p style={{ fontSize: 12, marginTop: 16 }}>Top sources: Instagram (42%) · Google (28%) · Direct (18%) · WhatsApp (12%)</p>
            <button className="modal-close" onClick={() => setShowAnalyticsDemo(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
