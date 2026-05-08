// pages/api/cron/send-followups.ts
// Vercel cron endpoint: runs hourly, sends due follow-ups if no reply received
import type { NextApiRequest, NextApiResponse } from 'next';
import { sql, getAllSettings } from '../../../lib/db';
import { sendCampaignEmail, htmlFromText, EMAIL_TEMPLATES, fillTemplate } from '../../../lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authenticate via Vercel cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const settings = await getAllSettings();
    const dailyLimit = parseInt(settings.outreach_daily_limit || '40');
    const today = new Date().toISOString().split('T')[0];
    
    const sentToday = await sql`
      SELECT COUNT(*)::int as count FROM email_campaigns
      WHERE sent_at >= ${today}::date AND status NOT IN ('failed', 'pending')
    `;
    const remaining = Math.max(0, dailyLimit - sentToday[0].count);

    // Find pending follow-ups that are due, where lead hasn't replied
    const due = await sql`
      SELECT ec.id as campaign_id, ec.template_key, ec.lead_id,
             l.email, l.business_name, l.contact_name, l.city, l.location, l.source, l.instagram, l.website, l.status as lead_status
      FROM email_campaigns ec
      JOIN leads l ON ec.lead_id = l.id
      WHERE ec.status = 'pending'
        AND ec.scheduled_for IS NOT NULL
        AND ec.scheduled_for <= NOW()
        AND l.status NOT IN ('replied', 'qualified', 'closed_won', 'closed_lost')
        AND l.email IS NOT NULL
      ORDER BY ec.scheduled_for ASC
      LIMIT ${remaining}
    `;

    let sent = 0;
    let failed = 0;

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    for (const row of due) {
      const tpl = EMAIL_TEMPLATES[row.template_key as keyof typeof EMAIL_TEMPLATES];
      if (!tpl) {
        await sql`UPDATE email_campaigns SET status = 'failed', error_message = 'Template not found' WHERE id = ${row.campaign_id}`;
        failed++;
        continue;
      }

      const vars = {
        business_name: row.business_name || '',
        contact_name: row.contact_name || 'there',
        city: row.city || 'Lagos',
        location: row.location || row.city || 'Lagos',
        source: row.source === 'instagram' ? 'Instagram' : (row.source === 'propertypro' ? 'PropertyPro' : 'a search'),
        current_method: row.instagram ? 'Instagram DMs' : (row.website ? 'your website' : 'phone or DMs'),
        demo_url: settings.outreach_demo_url || '',
        your_name: settings.outreach_from_name || 'Me',
        your_phone: settings.contact_phone || ''
      };

      // Delete the placeholder, send fresh
      await sql`DELETE FROM email_campaigns WHERE id = ${row.campaign_id}`;

      const result = await sendCampaignEmail({
        leadId: row.lead_id,
        to: row.email,
        subject: fillTemplate(tpl.subject, vars),
        htmlBody: htmlFromText(fillTemplate(tpl.body, vars)),
        textBody: fillTemplate(tpl.body, vars),
        templateKey: row.template_key
      }, baseUrl);

      if (result.success) sent++;
      else failed++;

      await new Promise(r => setTimeout(r, 300));
    }

    return res.status(200).json({ checked: due.length, sent, failed });
  } catch (err: any) {
    console.error('Cron error:', err);
    return res.status(500).json({ error: err.message });
  }
}
