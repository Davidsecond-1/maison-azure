// pages/api/email/send.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sql, getAllSettings } from '../../../lib/db';
import { getAdminFromRequest } from '../../../lib/auth';
import { sendCampaignEmail, htmlFromText, EMAIL_TEMPLATES, fillTemplate } from '../../../lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { lead_id, subject, body, template_key } = req.body;

    if (!lead_id) return res.status(400).json({ error: 'lead_id required' });

    // Fetch lead
    const leads = await sql`SELECT * FROM leads WHERE id = ${lead_id} LIMIT 1`;
    if (!leads.length) return res.status(404).json({ error: 'Lead not found' });
    const lead = leads[0];

    if (!lead.email) return res.status(400).json({ error: 'Lead has no email address' });

    // Daily rate limit check
    const settings = await getAllSettings();
    const dailyLimit = parseInt(settings.outreach_daily_limit || '40');
    const today = new Date().toISOString().split('T')[0];
    const sentToday = await sql`
      SELECT COUNT(*)::int as count FROM email_campaigns
      WHERE sent_at >= ${today}::date AND status NOT IN ('failed', 'pending')
    `;
    if (sentToday[0].count >= dailyLimit) {
      return res.status(429).json({ error: `Daily limit of ${dailyLimit} emails reached. Resume tomorrow.` });
    }

    // Resolve subject + body (use template if provided, otherwise use raw)
    let finalSubject = subject;
    let finalBody = body;

    if (template_key && EMAIL_TEMPLATES[template_key as keyof typeof EMAIL_TEMPLATES]) {
      const tpl = EMAIL_TEMPLATES[template_key as keyof typeof EMAIL_TEMPLATES];
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
      finalSubject = subject || fillTemplate(tpl.subject, vars);
      finalBody = body || fillTemplate(tpl.body, vars);
    }

    if (!finalSubject || !finalBody) {
      return res.status(400).json({ error: 'Subject and body required' });
    }

    // Determine base URL for tracking links
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    // Send
    const result = await sendCampaignEmail({
      leadId: lead.id,
      to: lead.email,
      subject: finalSubject,
      htmlBody: htmlFromText(finalBody),
      textBody: finalBody,
      templateKey: template_key
    }, baseUrl);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(200).json({ success: true, campaign_id: result.campaignId });
  } catch (err: any) {
    console.error('Email send error:', err);
    return res.status(500).json({ error: err.message });
  }
}
