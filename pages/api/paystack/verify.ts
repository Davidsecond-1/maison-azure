import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const reference = (req.body?.reference || req.query?.reference) as string;

    if (!reference) {
      return res.status(400).json({ error: 'Payment reference required' });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    // Verify with Paystack
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const verifyData = await verifyRes.json();

    if (!verifyData.status || verifyData.data.status !== 'success') {
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed',
        status: verifyData.data?.status
      });
    }

    // Find booking by paystack reference
    const bookings = await sql`
      SELECT * FROM bookings
      WHERE paystack_reference = ${reference}
      LIMIT 1
    `;

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookings[0];

    // Avoid double-processing
    if (booking.payment_status === 'deposit_paid' || booking.payment_status === 'fully_paid') {
      return res.status(200).json({
        success: true,
        already_paid: true,
        booking_reference: booking.reference,
        status: booking.status
      });
    }

    // Verify amount matches
    const paidAmount = verifyData.data.amount / 100; // Convert from kobo

    if (paidAmount < booking.deposit_amount) {
      return res.status(400).json({ error: 'Paid amount is less than deposit amount' });
    }

    // Determine payment status
    const newPaymentStatus = paidAmount >= booking.total_amount ? 'fully_paid' : 'deposit_paid';

    // Update booking
    await sql`
      UPDATE bookings
      SET payment_status = ${newPaymentStatus},
          status = 'confirmed',
          updated_at = NOW()
      WHERE id = ${booking.id}
    `;

    // Track event
    await sql`
      INSERT INTO analytics_events (session_id, event_name, event_data)
      VALUES (
        ${(req.headers['x-session-id'] as string) || 'system'},
        'payment_confirmed',
        ${JSON.stringify({ reference: booking.reference, amount: paidAmount })}
      )
    `;

    return res.status(200).json({
      success: true,
      booking_reference: booking.reference,
      payment_status: newPaymentStatus,
      amount_paid: paidAmount
    });
  } catch (error: any) {
    console.error('Paystack verify error:', error);
    return res.status(500).json({ error: 'Payment verification failed' });
  }
}
