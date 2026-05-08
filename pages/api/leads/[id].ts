// pages/api/leads/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '../../../lib/db';
import { getAdminFromRequest } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  const id = parseInt(req.query.id as string);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  if (req.method === 'GET') {
    const lead = await sql`SELECT * FROM leads WHERE id = ${id}`;
    if (!lead.length) return res.status(404).json({ error: 'Not found' });
    
    const campaigns = await sql`
      SELECT * FROM email_campaigns WHERE lead_id = ${id} ORDER BY created_at DESC
    `;
    return res.status(200).json({ lead: lead[0], campaigns });
  }

  if (req.method === 'PATCH') {
    const updates = req.body;
    const allowedFields = ['business_name', 'contact_name', 'email', 'phone', 'whatsapp', 'instagram', 'website', 'location', 'city', 'property_type', 'status', 'notes'];
    
    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) continue;
      // Use parameterized via tagged template per-field
      switch (key) {
        case 'business_name':
          await sql`UPDATE leads SET business_name = ${value as string}, updated_at = NOW() WHERE id = ${id}`;
          break;
        case 'contact_name':
          await sql`UPDATE leads SET contact_name = ${value as string}, updated_at = NOW() WHERE id = ${id}`;
          break;
        case 'email':
          await sql`UPDATE leads SET email = ${value as string}, updated_at = NOW() WHERE id = ${id}`;
          break;
        case 'phone':
          await sql`UPDATE leads SET phone = ${value as string}, updated_at = NOW() WHERE id = ${id}`;
          break;
        case 'whatsapp':
          await sql`UPDATE leads SET whatsapp = ${value as string}, updated_at = NOW() WHERE id = ${id}`;
          break;
        case 'instagram':
          await sql`UPDATE leads SET instagram = ${value as string}, updated_at = NOW() WHERE id = ${id}`;
          break;
        case 'website':
          await sql`UPDATE leads SET website = ${value as string}, updated_at = NOW() WHERE id = ${id}`;
          break;
        case 'location':
          await sql`UPDATE leads SET location = ${value as string}, updated_at = NOW() WHERE id = ${id}`;
          break;
        case 'city':
          await sql`UPDATE leads SET city = ${value as string}, updated_at = NOW() WHERE id = ${id}`;
          break;
        case 'property_type':
          await sql`UPDATE leads SET property_type = ${value as string}, updated_at = NOW() WHERE id = ${id}`;
          break;
        case 'status':
          await sql`UPDATE leads SET status = ${value as string}, updated_at = NOW() WHERE id = ${id}`;
          break;
        case 'notes':
          await sql`UPDATE leads SET notes = ${value as string}, updated_at = NOW() WHERE id = ${id}`;
          break;
      }
    }
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM leads WHERE id = ${id}`;
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
