import type { NextApiRequest, NextApiResponse } from 'next';
import { sql, generateReference, calculateBookingTotal, getAllSettings } from '../../lib/db';
import { getAdminFromRequest } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return createBooking(req, res);
  } else if (req.method === 'GET') {
    return listBookings(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function createBooking(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      guest_name,
      guest_email,
      guest_phone,
      check_in,
      check_out,
      guest_count,
      special_requests = ''
    } = req.body;

    // Validation
    if (!guest_name || !guest_email || !guest_phone || !check_in || !check_out || !guest_count) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const inDate = new Date(check_in);
    const outDate = new Date(check_out);
    
    if (outDate <= inDate) {
      return res.status(400).json({ error: 'Check-out must be after check-in' });
    }
    
    if (inDate < new Date(new Date().toDateString())) {
      return res.status(400).json({ error: 'Check-in cannot be in the past' });
    }

    // Get settings
    const settings = await getAllSettings();
    const nightlyRate = parseInt(settings.nightly_rate || '485000');
    const cleaningFee = parseInt(settings.cleaning_fee || '45000');
    const weeklyDiscount = parseInt(settings.weekly_discount || '10');
    const monthlyDiscount = parseInt(settings.monthly_discount || '20');
    const minNights = parseInt(settings.min_nights || '2');
    const maxGuests = parseInt(settings.max_guests || '6');

    // Calculate total
    const { nights, total } = calculateBookingTotal(
      check_in, check_out, nightlyRate, cleaningFee, weeklyDiscount, monthlyDiscount
    );

    if (nights < minNights) {
      return res.status(400).json({ error: `Minimum stay is ${minNights} nights` });
    }

    if (guest_count > maxGuests) {
      return res.status(400).json({ error: `Maximum ${maxGuests} guests allowed` });
    }

    // Check availability - no overlapping confirmed/pending bookings
    const conflicts = await sql`
      SELECT id FROM bookings
      WHERE status IN ('pending', 'confirmed')
        AND check_in < ${check_out}
        AND check_out > ${check_in}
      LIMIT 1
    `;

    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'Selected dates are not available' });
    }

    // Check blocked dates
    const blocked = await sql`
      SELECT id FROM blocked_dates
      WHERE start_date < ${check_out}
        AND end_date > ${check_in}
      LIMIT 1
    `;

    if (blocked.length > 0) {
      return res.status(409).json({ error: 'Selected dates are not available' });
    }

    // Create booking
    const reference = generateReference();
    const depositAmount = Math.round(total / 2);

    const result = await sql`
      INSERT INTO bookings (
        reference, guest_name, guest_email, guest_phone,
        check_in, check_out, guest_count, nights,
        nightly_rate, cleaning_fee, total_amount, deposit_amount,
        special_requests, status, payment_status
      ) VALUES (
        ${reference}, ${guest_name}, ${guest_email}, ${guest_phone},
        ${check_in}, ${check_out}, ${guest_count}, ${nights},
        ${nightlyRate}, ${cleaningFee}, ${total}, ${depositAmount},
        ${special_requests}, 'pending', 'unpaid'
      )
      RETURNING id, reference, total_amount, deposit_amount
    `;

    const booking = result[0];

    // Track event
    await sql`
      INSERT INTO analytics_events (session_id, event_name, event_data)
      VALUES (${(req.headers['x-session-id'] as string) || 'unknown'}, 'booking_created', ${JSON.stringify({ reference, total, nights })})
    `;

    return res.status(201).json({
      success: true,
      reference: booking.reference,
      booking_id: booking.id,
      total_amount: booking.total_amount,
      deposit_amount: booking.deposit_amount
    });
  } catch (error: any) {
    console.error('Booking creation error:', error);
    return res.status(500).json({ error: 'Failed to create booking', details: error.message });
  }
}

async function listBookings(req: NextApiRequest, res: NextApiResponse) {
  // Admin only
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const status = req.query.status as string;
    
    let bookings;
    if (status && status !== 'all') {
      bookings = await sql`
        SELECT * FROM bookings
        WHERE status = ${status}
        ORDER BY created_at DESC
        LIMIT 200
      `;
    } else {
      bookings = await sql`
        SELECT * FROM bookings
        ORDER BY created_at DESC
        LIMIT 200
      `;
    }

    return res.status(200).json({ bookings });
  } catch (error: any) {
    console.error('List bookings error:', error);
    return res.status(500).json({ error: 'Failed to list bookings' });
  }
}
