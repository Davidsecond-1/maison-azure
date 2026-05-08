import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ error: 'Booking reference required' });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    // Get booking
    const bookings = await sql`
      SELECT * FROM bookings WHERE reference = ${reference} LIMIT 1
    `;

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookings[0];

    if (booking.payment_status !== 'unpaid') {
      return res.status(400).json({ error: 'Booking already paid' });
    }

    // Build callback URL
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const callbackUrl = `${protocol}://${host}/booking/confirm?ref=${reference}`;

    // Initialize Paystack transaction
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: booking.guest_email,
        amount: booking.deposit_amount * 100, // Paystack uses kobo
        reference: `${booking.reference}-${Date.now()}`,
        callback_url: callbackUrl,
        metadata: {
          booking_id: booking.id,
          booking_reference: booking.reference,
          guest_name: booking.guest_name,
          custom_fields: [
            {
              display_name: 'Booking Reference',
              variable_name: 'booking_ref',
              value: booking.reference
            },
            {
              display_name: 'Check-in',
              variable_name: 'check_in',
              value: new Date(booking.check_in).toLocaleDateString('en-GB')
            },
            {
              display_name: 'Check-out',
              variable_name: 'check_out',
              value: new Date(booking.check_out).toLocaleDateString('en-GB')
            }
          ]
        }
      })
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      console.error('Paystack init failed:', paystackData);
      return res.status(500).json({ error: 'Payment initialization failed', details: paystackData.message });
    }

    // Save Paystack reference
    await sql`
      UPDATE bookings
      SET paystack_reference = ${paystackData.data.reference}
      WHERE id = ${booking.id}
    `;

    return res.status(200).json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackData.data.reference
    });
  } catch (error: any) {
    console.error('Paystack init error:', error);
    return res.status(500).json({ error: 'Payment initialization failed' });
  }
}
