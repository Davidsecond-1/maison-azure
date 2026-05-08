import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '../../../lib/db';
import { hashPassword } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const users = await sql`
    SELECT id FROM admin_users
    WHERE reset_token = ${token}
      AND reset_token_expires_at > NOW()
    LIMIT 1
  `;

  if (users.length === 0) return res.status(400).json({ error: 'Invalid or expired reset link' });

  const hash = await hashPassword(password);

  await sql`
    UPDATE admin_users
    SET password_hash = ${hash}, reset_token = NULL, reset_token_expires_at = NULL
    WHERE id = ${users[0].id}
  `;

  return res.status(200).json({ ok: true });
}
