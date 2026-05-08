// pages/api/track/click.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cid = parseInt(req.query.cid as string);
  const url = req.query.url as string;
  
  if (!url) {
    return res.status(400).send('Missing url');
  }

  // Validate it's a real URL (prevent open redirect)
  let safeUrl: string;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).send('Invalid url');
    }
    safeUrl = parsed.toString();
  } catch {
    return res.status(400).send('Invalid url');
  }

  if (!isNaN(cid)) {
    try {
      const userAgent = (req.headers['user-agent'] || '').slice(0, 500);
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
      
      await sql`
        INSERT INTO email_events (campaign_id, event_type, user_agent, ip_address, link_url)
        VALUES (${cid}, 'clicked', ${userAgent}, ${ip}, ${safeUrl})
      `;
      
      const result = await sql`
        UPDATE email_campaigns
        SET 
          status = CASE WHEN status IN ('sent', 'opened') THEN 'clicked' ELSE status END,
          clicked_at = COALESCE(clicked_at, NOW())
        WHERE id = ${cid}
        RETURNING lead_id
      `;
      
      if (result.length > 0) {
        await sql`
          UPDATE leads
          SET status = CASE WHEN status IN ('contacted', 'opened', 'new') THEN 'opened' ELSE status END,
              updated_at = NOW()
          WHERE id = ${result[0].lead_id}
        `;
      }
    } catch (err) {
      console.error('Click track error:', err);
    }
  }

  // 302 redirect to actual URL
  res.redirect(302, safeUrl);
}
