// lib/email.ts
// Resend email integration with tracking pixel + click tracking

import { sql, getSetting } from './db';

const RESEND_API_BASE = 'https://api.resend.com';

export interface SendEmailParams {
  leadId: number;
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  templateKey?: string;
  scheduledFor?: Date;
}

// Inject tracking pixel + rewrite links for click tracking
export function instrumentHtml(html: string, campaignId: number, baseUrl: string): string {
  // Tracking pixel for opens
  const pixelUrl = `${baseUrl}/api/track/open?cid=${campaignId}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none" />`;
  
  // Rewrite all <a href="..."> for click tracking
  let instrumented = html.replace(
    /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
    (match, before, url, after) => {
      // Don't rewrite mailto:, tel:, anchor links
      if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#')) {
        return match;
      }
      const trackUrl = `${baseUrl}/api/track/click?cid=${campaignId}&url=${encodeURIComponent(url)}`;
      return `<a ${before}href="${trackUrl}"${after}>`;
    }
  );
  
  // Append pixel before </body> or at end
  if (instrumented.includes('</body>')) {
    instrumented = instrumented.replace('</body>', `${pixel}</body>`);
  } else {
    instrumented += pixel;
  }
  
  return instrumented;
}

export async function sendViaResend(params: {
  from: string;
  replyTo?: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ id?: string; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { error: 'RESEND_API_KEY not configured' };
  }

  try {
    const res = await fetch(`${RESEND_API_BASE}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: params.from,
        reply_to: params.replyTo,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text
      })
    });

    const data = await res.json();
    
    if (!res.ok) {
      return { error: data.message || data.error || 'Send failed' };
    }

    return { id: data.id };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function sendCampaignEmail(
  params: SendEmailParams,
  baseUrl: string
): Promise<{ success: boolean; campaignId?: number; error?: string }> {
  // Create campaign record first
  const campaignRes = await sql`
    INSERT INTO email_campaigns (lead_id, template_key, subject, body, status)
    VALUES (${params.leadId}, ${params.templateKey || 'manual'}, ${params.subject}, ${params.htmlBody}, 'pending')
    RETURNING id
  `;
  const campaignId = campaignRes[0].id;

  // Instrument HTML
  const trackedHtml = instrumentHtml(params.htmlBody, campaignId, baseUrl);

  // Get sender info
  const fromName = (await getSetting('outreach_from_name')) || 'Your Name';
  const fromEmail = (await getSetting('outreach_from_email')) || '';
  const replyTo = (await getSetting('outreach_reply_to')) || fromEmail;

  if (!fromEmail) {
    await sql`UPDATE email_campaigns SET status = 'failed', error_message = 'No sender email configured' WHERE id = ${campaignId}`;
    return { success: false, error: 'Sender email not configured. Set it in Settings.' };
  }

  // Send via Resend
  const result = await sendViaResend({
    from: `${fromName} <${fromEmail}>`,
    replyTo,
    to: params.to,
    subject: params.subject,
    html: trackedHtml,
    text: params.textBody
  });

  if (result.error) {
    await sql`
      UPDATE email_campaigns 
      SET status = 'failed', error_message = ${result.error}
      WHERE id = ${campaignId}
    `;
    return { success: false, campaignId, error: result.error };
  }

  // Mark as sent, update lead
  await sql`
    UPDATE email_campaigns
    SET status = 'sent', sent_at = NOW(), resend_email_id = ${result.id || null}
    WHERE id = ${campaignId}
  `;
  
  await sql`
    UPDATE leads
    SET status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END,
        last_contacted_at = NOW(),
        updated_at = NOW()
    WHERE id = ${params.leadId}
  `;

  return { success: true, campaignId };
}

// Email templates
export const EMAIL_TEMPLATES = {
  opener: {
    label: 'Cold Opener',
    subject: 'A booking website for {{business_name}}',
    body: `Hi {{contact_name}},

I came across {{business_name}} on {{source}} and noticed you take bookings through {{current_method}} — which usually means leaving 15-20% on the table to commission fees, or losing guests who don't want to message on Instagram to book.

I build done-for-you booking websites for premium short-lets and serviced apartments in {{city}}. Direct payments via Paystack, real-time availability, and a private analytics dashboard so you can see who's viewing.

Live demo of what I deliver: {{demo_url}}

If this is something you've thought about, I'd love to walk you through it on a 15-min call. ₦450,000 once-off, ready in 7 days.

Best,
{{your_name}}
{{your_phone}}`
  },
  followup_1: {
    label: 'Follow-up #1 (3 days)',
    subject: 'Re: A booking website for {{business_name}}',
    body: `Hi {{contact_name}},

Just floating this back up — imagine your inbox is busy.

If a website isn't a priority right now, no worries. But if it is, the short version:

→ ₦450,000, paid 50% upfront
→ 7-day delivery
→ Custom domain, Paystack payments, owner analytics
→ I handle hosting setup and your first month of edits

Worth a quick chat?

{{your_name}}`
  },
  followup_2: {
    label: 'Follow-up #2 (final, 7 days)',
    subject: 'Last note from me — {{business_name}}',
    body: `Hi {{contact_name}},

This will be my last note on this — don't want to clutter your inbox.

If you ever want a direct booking website that doesn't lose 15% to Airbnb, my line is always open. The demo is here whenever: {{demo_url}}

Wishing {{business_name}} the best either way.

{{your_name}}`
  },
  post_demo: {
    label: 'After Demo Call (close)',
    subject: 'Your booking website — next steps',
    body: `Hi {{contact_name}},

Thanks for the call today. Quick recap of what we discussed:

✓ Custom-designed booking website for {{business_name}}
✓ Paystack payment integration (instant deposits)
✓ Owner analytics dashboard
✓ Custom domain + hosting setup
✓ Mobile-optimized + WhatsApp click-to-chat
✓ Delivery: 7 working days from deposit

Investment: ₦450,000 (₦225,000 to start, ₦225,000 on delivery)

Bank details for the deposit:
[Your account info]

Once received, I'll send a brief intake form and we'll be live in a week.

{{your_name}}`
  }
};

export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
}

export function htmlFromText(text: string): string {
  // Convert plain-text email to simple HTML
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Auto-link URLs
  const linked = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#a8854a;text-decoration:underline">$1</a>'
  );
  
  // Convert newlines to <br>
  const html = linked.replace(/\n/g, '<br />');
  
  return `<!DOCTYPE html><html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1814; max-width: 580px; margin: 0 auto; padding: 20px;">${html}</body></html>`;
}
