import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all booked + blocked dates for next 6 months
    const today = new Date().toISOString().split('T')[0];
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    const futureDate = sixMonthsLater.toISOString().split('T')[0];

    const bookings = await sql`
      SELECT check_in, check_out FROM bookings
      WHERE status IN ('pending', 'confirmed')
        AND check_out >= ${today}
        AND check_in <= ${futureDate}
    `;

    const blocked = await sql`
      SELECT start_date as check_in, end_date as check_out FROM blocked_dates
      WHERE end_date >= ${today}
        AND start_date <= ${futureDate}
    `;

    const ranges = [
      ...bookings.map((b: any) => ({ start: b.check_in, end: b.check_out, type: 'booked' })),
      ...blocked.map((b: any) => ({ start: b.check_in, end: b.check_out, type: 'blocked' }))
    ];

    return res.status(200).json({ unavailable: ranges });
  } catch (error: any) {
    console.error('Availability error:', error);
    return res.status(500).json({ error: 'Failed to fetch availability' });
  }
}
