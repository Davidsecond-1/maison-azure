// pages/api/track/open.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '../../../lib/db';

// 1x1 transparent GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cid = parseInt(req.query.cid as string);
  
  // Always return the pixel — never break the email
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  if (!isNaN(cid)) {
    try {
      const userAgent = (req.headers['user-agent'] || '').slice(0, 500);
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
      
      // Skip Gmail's image proxy (they pre-fetch images, false positives)
      const isGmailProxy = userAgent.includes('GoogleImageProxy');
      
      // Record event
      await sql`
        INSERT INTO email_events (campaign_id, event_type, user_agent, ip_address)
        VALUES (${cid}, 'opened', ${userAgent}, ${ip})
      `;

      // Update campaign
      const result = await sql`
        UPDATE email_campaigns
        SET 
          status = CASE WHEN status = 'sent' THEN 'opened' ELSE status END,
          first_opened_at = COALESCE(first_opened_at, NOW()),
          last_opened_at = NOW(),
          open_count = open_count + 1
        WHERE id = ${cid}
        RETURNING lead_id
      `;

      if (result.length > 0 && !isGmailProxy) {
        // Update lead's last_opened
        await sql`
          UPDATE leads
          SET 
            email_open_count = email_open_count + 1,
            email_last_opened_at = NOW(),
            status = CASE WHEN status IN ('contacted', 'new') THEN 'opened' ELSE status END,
            updated_at = NOW()
          WHERE id = ${result[0].lead_id}
        `;
      }
    } catch (err) {
      // Silently ignore - never break the email
      console.error('Open track error:', err);
    }
  }

  res.status(200).send(PIXEL);
}
