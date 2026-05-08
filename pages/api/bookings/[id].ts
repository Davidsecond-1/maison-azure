import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '../../../lib/db';
import { getAdminFromRequest } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (req.method === 'PATCH') {
    try {
      const { status, payment_status } = req.body;
      
      if (status) {
        await sql`UPDATE bookings SET status = ${status}, updated_at = NOW() WHERE id = ${id}`;
      }
      if (payment_status) {
        await sql`UPDATE bookings SET payment_status = ${payment_status}, updated_at = NOW() WHERE id = ${id}`;
      }
      
      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: 'Update failed' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await sql`DELETE FROM bookings WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: 'Delete failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
