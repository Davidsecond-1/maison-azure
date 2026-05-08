// pages/api/email/webhook.ts
// Receives webhook events from Resend
import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const event = req.body;
    const eventType = event.type; // email.delivered, email.bounced, email.complained, email.opened, etc.
    const data = event.data;
    const resendId = data?.email_id || data?.id;

    if (!resendId) return res.status(200).end();

    // Find campaign by resend_email_id
    const campaigns = await sql`
      SELECT id, lead_id FROM email_campaigns WHERE resend_email_id = ${resendId} LIMIT 1
    `;
    if (!campaigns.length) return res.status(200).end();

    const campaign = campaigns[0];

    if (eventType === 'email.delivered') {
      await sql`
        UPDATE email_campaigns SET status = 'delivered', delivered_at = NOW() WHERE id = ${campaign.id}
      `;
    } else if (eventType === 'email.bounced') {
      await sql`
        UPDATE email_campaigns SET status = 'bounced', bounced_at = NOW() WHERE id = ${campaign.id}
      `;
      await sql`
        UPDATE leads SET status = 'closed_lost', notes = COALESCE(notes, '') || E'\nEmail bounced.' WHERE id = ${campaign.lead_id}
      `;
    } else if (eventType === 'email.complained') {
      await sql`
        UPDATE leads SET status = 'closed_lost', notes = COALESCE(notes, '') || E'\nMarked email as spam.' WHERE id = ${campaign.lead_id}
      `;
    }

    await sql`
      INSERT INTO email_events (campaign_id, event_type)
      VALUES (${campaign.id}, ${eventType})
    `;

    res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    res.status(200).json({ ok: false }); // Always 200 so Resend doesn't retry
  }
}
