import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '../../lib/db';
import { hashPassword } from '../../lib/auth';

// One-time setup endpoint. Only works if no admin exists yet.
// Visit: /api/setup?email=you@example.com&password=YourPassword&name=YourName

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check if any admin already exists
    const existing = await sql`SELECT COUNT(*)::int as count FROM admin_users`;
    
    if (existing[0].count > 0) {
      return res.status(403).json({
        error: 'Setup already complete. Admin user already exists. Use /admin/login.'
      });
    }

    const email = (req.query.email || req.body?.email) as string;
    const password = (req.query.password || req.body?.password) as string;
    const name = ((req.query.name || req.body?.name) as string) || 'Admin';

    if (!email || !password) {
      return res.status(400).json({
        error: 'Provide email and password as query parameters: /api/setup?email=...&password=...&name=...'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const passwordHash = await hashPassword(password);

    await sql`
      INSERT INTO admin_users (email, password_hash, name)
      VALUES (${email.toLowerCase()}, ${passwordHash}, ${name})
    `;

    return res.status(201).json({
      success: true,
      message: 'Admin created successfully. You can now login at /admin/login',
      email: email.toLowerCase()
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    return res.status(500).json({ error: 'Setup failed', details: error.message });
  }
}
