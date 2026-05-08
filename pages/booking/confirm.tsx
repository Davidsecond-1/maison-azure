import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function ConfirmBooking() {
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [bookingRef, setBookingRef] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Paystack returns ?reference=xxx and ?trxref=xxx (same value)
    const reference = router.query.reference || router.query.trxref;
    if (!reference) return;

    fetch('/api/paystack/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setStatus('success');
          setBookingRef(data.booking_reference || '');
        } else {
          setStatus('failed');
          setErrorMsg(data.error || 'Payment verification failed');
        }
      })
      .catch(err => {
        setStatus('failed');
        setErrorMsg(err.message || 'Network error');
      });
  }, [router.query]);

  return (
    <>
      <Head>
        <title>Reservation Confirmation</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;1,300&family=Inter+Tight:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#f5f1ea', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Inter Tight', sans-serif", color: '#1a1814' }}>
        <div style={{ maxWidth: 520, width: '100%', background: 'white', padding: '60px 50px', textAlign: 'center', position: 'relative', boxShadow: '0 20px 60px rgba(26,24,20,0.08)' }}>
          <div style={{ position: 'absolute', inset: 16, border: '1px solid rgba(26,24,20,0.12)', pointerEvents: 'none' }} />
          
          {status === 'verifying' && (
            <>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 300, fontStyle: 'italic', marginBottom: 16, color: '#7a5e2f' }}>
                Verifying...
              </h1>
              <p style={{ color: '#8a8378', fontSize: 14, lineHeight: 1.6 }}>
                Confirming your payment with Paystack. This will only take a moment.
              </p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div style={{ width: 60, height: 60, border: '1.5px solid #a8854a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 28, color: '#a8854a' }}>✓</div>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 36, fontWeight: 300, fontStyle: 'italic', marginBottom: 12, color: '#7a5e2f' }}>
                Reservation confirmed
              </h1>
              <p style={{ color: '#8a8378', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                Thank you. Your deposit has been received and your reservation is confirmed.
              </p>
              {bookingRef && (
                <div style={{ padding: '16px 20px', background: '#f5f1ea', border: '1px solid rgba(26,24,20,0.12)', marginBottom: 24 }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#8a8378', marginBottom: 6 }}>Booking reference</div>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, letterSpacing: '0.05em' }}>{bookingRef}</div>
                </div>
              )}
              <p style={{ color: '#8a8378', fontSize: 13, lineHeight: 1.6, marginBottom: 32 }}>
                A member of the house will contact you within 24 hours with arrival details and key handover information. Please save your booking reference.
              </p>
              <a href="/" style={{ display: 'inline-block', background: '#1a1814', color: '#f5f1ea', padding: '14px 32px', textDecoration: 'none', fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase' }}>
                Return Home
              </a>
            </>
          )}
          
          {status === 'failed' && (
            <>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 300, fontStyle: 'italic', marginBottom: 16, color: '#a83a3a' }}>
                Payment incomplete
              </h1>
              <p style={{ color: '#8a8378', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                We couldn't confirm your payment. {errorMsg && `(${errorMsg})`}
              </p>
              <p style={{ color: '#8a8378', fontSize: 13, lineHeight: 1.6, marginBottom: 32 }}>
                If money was debited from your account, please contact us with your transaction reference and we'll resolve it within 24 hours.
              </p>
              <a href="/" style={{ display: 'inline-block', background: '#1a1814', color: '#f5f1ea', padding: '14px 32px', textDecoration: 'none', fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase' }}>
                Try Again
              </a>
            </>
          )}
        </div>
      </div>
    </>
  );
}
