import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { sql } from '../../../lib/db';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const users = await sql`SELECT id, name FROM admin_users WHERE email = ${email.toLowerCase()} LIMIT 1`;

  // Always respond OK to avoid leaking whether email exists
  if (users.length === 0) return res.status(200).json({ ok: true });

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await sql`
    UPDATE admin_users
    SET reset_token = ${token}, reset_token_expires_at = ${expires}
    WHERE id = ${users[0].id}
  `;

  const host = req.headers.host;
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const resetUrl = `${protocol}://${host}/admin/reset-password?token=${token}`;

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'noreply@maisonazure.scale-arm.com',
    to: email,
    subject: 'Reset your Maison Azure password',
    html: `
      <div style="font-family:'Inter Tight',sans-serif;max-width:480px;margin:40px auto;color:#1a1814">
        <div style="font-family:Georgia,serif;font-size:26px;font-style:italic;margin-bottom:8px">Maison Azure</div>
        <p style="margin-bottom:24px;color:#666;font-size:13px">Hi ${users[0].name || 'there'},</p>
        <p style="margin-bottom:24px;font-size:14px">Click the button below to reset your admin password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#a8854a;color:#1a1814;text-decoration:none;padding:14px 28px;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;font-weight:600">${'RESET PASSWORD'}</a>
        <p style="margin-top:28px;font-size:12px;color:#999">If you didn't request this, ignore this email — your password won't change.</p>
        <p style="margin-top:8px;font-size:11px;color:#bbb">Link: ${resetUrl}</p>
      </div>
    `
  });

  return res.status(200).json({ ok: true });
}
