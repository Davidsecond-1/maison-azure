import type { NextApiRequest, NextApiResponse } from 'next';
import { sql, getAllSettings } from '../../lib/db';
import { getAdminFromRequest } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const settings = await getAllSettings();
    return res.status(200).json({ settings });
  }

  if (req.method === 'PUT') {
    const admin = getAdminFromRequest(req);
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { settings } = req.body;
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Settings object required' });
      }

      for (const [key, value] of Object.entries(settings)) {
        await sql`
          INSERT INTO site_settings (key, value, updated_at)
          VALUES (${key}, ${String(value)}, NOW())
          ON CONFLICT (key) DO UPDATE SET value = ${String(value)}, updated_at = NOW()
        `;
      }

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Update settings error:', error);
      return res.status(500).json({ error: 'Failed to update settings' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
