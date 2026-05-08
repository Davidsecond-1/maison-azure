// pages/api/email/bulk.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sql, getAllSettings } from '../../../lib/db';
import { getAdminFromRequest } from '../../../lib/auth';
import { sendCampaignEmail, htmlFromText, EMAIL_TEMPLATES, fillTemplate } from '../../../lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { lead_ids, template_key = 'opener' } = req.body;

    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ error: 'lead_ids array required' });
    }

    const settings = await getAllSettings();
    const dailyLimit = parseInt(settings.outreach_daily_limit || '40');
    
    const today = new Date().toISOString().split('T')[0];
    const sentToday = await sql`
      SELECT COUNT(*)::int as count FROM email_campaigns
      WHERE sent_at >= ${today}::date AND status NOT IN ('failed', 'pending')
    `;
    
    const remaining = dailyLimit - sentToday[0].count;
    if (remaining <= 0) {
      return res.status(429).json({ error: `Daily limit of ${dailyLimit} reached.` });
    }

    const toSend = lead_ids.slice(0, remaining);
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    const tpl = EMAIL_TEMPLATES[template_key as keyof typeof EMAIL_TEMPLATES];
    if (!tpl) return res.status(400).json({ error: 'Invalid template' });

    let sent = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const leadId of toSend) {
      try {
        const leads = await sql`SELECT * FROM leads WHERE id = ${leadId} LIMIT 1`;
        if (!leads.length || !leads[0].email) {
          failed++;
          continue;
        }
        const lead = leads[0];

        const vars = {
          business_name: lead.business_name || '',
          contact_name: lead.contact_name || 'there',
          city: lead.city || 'Lagos',
          location: lead.location || lead.city || 'Lagos',
          source: lead.source === 'instagram' ? 'Instagram' : (lead.source === 'propertypro' ? 'PropertyPro' : 'a search'),
          current_method: lead.instagram ? 'Instagram DMs' : (lead.website ? 'your website' : 'phone or DMs'),
          demo_url: settings.outreach_demo_url || '',
          your_name: settings.outreach_from_name || 'Me',
          your_phone: settings.contact_phone || ''
        };

        const result = await sendCampaignEmail({
          leadId,
          to: lead.email,
          subject: fillTemplate(tpl.subject, vars),
          htmlBody: htmlFromText(fillTemplate(tpl.body, vars)),
          textBody: fillTemplate(tpl.body, vars),
          templateKey: template_key
        }, baseUrl);

        if (result.success) {
          sent++;
          
          // Schedule follow-ups
          const followup1Days = parseInt(settings.outreach_followup_1_days || '3');
          const followup2Days = parseInt(settings.outreach_followup_2_days || '7');
          
          const followup1At = new Date(Date.now() + followup1Days * 86400000);
          const followup2At = new Date(Date.now() + followup2Days * 86400000);
          
          // Only schedule if this was the opener
          if (template_key === 'opener') {
            await sql`
              INSERT INTO email_campaigns (lead_id, template_key, status, scheduled_for)
              VALUES (${leadId}, 'followup_1', 'pending', ${followup1At})
            `;
            await sql`
              INSERT INTO email_campaigns (lead_id, template_key, status, scheduled_for)
              VALUES (${leadId}, 'followup_2', 'pending', ${followup2At})
            `;
          }
        } else {
          failed++;
          errors.push({ lead_id: leadId, error: result.error });
        }

        // Rate-limit within the batch (don't slam Resend)
        await new Promise(r => setTimeout(r, 250));
      } catch (err: any) {
        failed++;
        errors.push({ lead_id: leadId, error: err.message });
      }
    }

    return res.status(200).json({
      sent,
      failed,
      skipped: lead_ids.length - toSend.length,
      errors: errors.slice(0, 5)
    });
  } catch (err: any) {
    console.error('Bulk email error:', err);
    return res.status(500).json({ error: err.message });
  }
}
