// pages/api/leads/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '../../../lib/db';
import { getAdminFromRequest } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') return listLeads(req, res);
  if (req.method === 'POST') return createLead(req, res);
  if (req.method === 'PUT') return bulkImport(req, res);
  return res.status(405).json({ error: 'Method not allowed' });
}

async function listLeads(req: NextApiRequest, res: NextApiResponse) {
  try {
    const status = req.query.status as string;
    const search = req.query.search as string;
    const city = req.query.city as string;

    let leads;
    
    if (search) {
      const searchPattern = `%${search}%`;
      leads = await sql`
        SELECT l.*,
          (SELECT COUNT(*)::int FROM email_campaigns WHERE lead_id = l.id) as email_count,
          (SELECT MAX(sent_at) FROM email_campaigns WHERE lead_id = l.id) as last_email_at
        FROM leads l
        WHERE (
          l.business_name ILIKE ${searchPattern} OR
          l.contact_name ILIKE ${searchPattern} OR
          l.email ILIKE ${searchPattern} OR
          l.location ILIKE ${searchPattern}
        )
        ${status && status !== 'all' ? sql`AND l.status = ${status}` : sql``}
        ${city && city !== 'all' ? sql`AND l.city = ${city}` : sql``}
        ORDER BY l.created_at DESC
        LIMIT 500
      `;
    } else if (status && status !== 'all' && city && city !== 'all') {
      leads = await sql`
        SELECT l.*,
          (SELECT COUNT(*)::int FROM email_campaigns WHERE lead_id = l.id) as email_count,
          (SELECT MAX(sent_at) FROM email_campaigns WHERE lead_id = l.id) as last_email_at
        FROM leads l
        WHERE l.status = ${status} AND l.city = ${city}
        ORDER BY l.created_at DESC
        LIMIT 500
      `;
    } else if (status && status !== 'all') {
      leads = await sql`
        SELECT l.*,
          (SELECT COUNT(*)::int FROM email_campaigns WHERE lead_id = l.id) as email_count,
          (SELECT MAX(sent_at) FROM email_campaigns WHERE lead_id = l.id) as last_email_at
        FROM leads l
        WHERE l.status = ${status}
        ORDER BY l.created_at DESC
        LIMIT 500
      `;
    } else if (city && city !== 'all') {
      leads = await sql`
        SELECT l.*,
          (SELECT COUNT(*)::int FROM email_campaigns WHERE lead_id = l.id) as email_count,
          (SELECT MAX(sent_at) FROM email_campaigns WHERE lead_id = l.id) as last_email_at
        FROM leads l
        WHERE l.city = ${city}
        ORDER BY l.created_at DESC
        LIMIT 500
      `;
    } else {
      leads = await sql`
        SELECT l.*,
          (SELECT COUNT(*)::int FROM email_campaigns WHERE lead_id = l.id) as email_count,
          (SELECT MAX(sent_at) FROM email_campaigns WHERE lead_id = l.id) as last_email_at
        FROM leads l
        ORDER BY l.created_at DESC
        LIMIT 500
      `;
    }

    // Aggregate stats
    const stats = await sql`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'new')::int as new_count,
        COUNT(*) FILTER (WHERE status = 'contacted')::int as contacted,
        COUNT(*) FILTER (WHERE status = 'opened')::int as opened,
        COUNT(*) FILTER (WHERE status = 'replied')::int as replied,
        COUNT(*) FILTER (WHERE status = 'qualified')::int as qualified,
        COUNT(*) FILTER (WHERE status = 'closed_won')::int as closed_won,
        COUNT(*) FILTER (WHERE status = 'closed_lost')::int as closed_lost
      FROM leads
    `;

    return res.status(200).json({ leads, stats: stats[0] });
  } catch (err: any) {
    console.error('List leads error:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function createLead(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      business_name,
      contact_name,
      email,
      phone,
      whatsapp,
      instagram,
      website,
      location,
      city = 'Lagos',
      property_type = 'short_let',
      source = 'manual',
      source_url,
      notes
    } = req.body;

    if (!business_name) {
      return res.status(400).json({ error: 'Business name required' });
    }

    const result = await sql`
      INSERT INTO leads (
        business_name, contact_name, email, phone, whatsapp, instagram,
        website, location, city, property_type, source, source_url, notes
      ) VALUES (
        ${business_name}, ${contact_name || null}, ${email || null}, ${phone || null},
        ${whatsapp || null}, ${instagram || null}, ${website || null},
        ${location || null}, ${city}, ${property_type}, ${source}, ${source_url || null}, ${notes || null}
      )
      RETURNING *
    `;

    return res.status(201).json({ lead: result[0] });
  } catch (err: any) {
    if (err.message?.includes('idx_leads_unique_email')) {
      return res.status(409).json({ error: 'A lead with this email already exists' });
    }
    return res.status(500).json({ error: err.message });
  }
}

async function bulkImport(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads)) return res.status(400).json({ error: 'leads array required' });

    let imported = 0;
    let skipped = 0;

    for (const lead of leads) {
      if (!lead.business_name) continue;
      try {
        await sql`
          INSERT INTO leads (
            business_name, contact_name, email, phone, whatsapp, instagram,
            website, location, city, property_type, source, source_url, notes
          ) VALUES (
            ${lead.business_name},
            ${lead.contact_name || null},
            ${lead.email || null},
            ${lead.phone || null},
            ${lead.whatsapp || lead.phone || null},
            ${lead.instagram || null},
            ${lead.website || null},
            ${lead.location || null},
            ${lead.city || 'Lagos'},
            ${lead.property_type || 'short_let'},
            ${lead.source || 'import'},
            ${lead.source_url || null},
            ${lead.notes || null}
          )
          ON CONFLICT (email) WHERE email IS NOT NULL AND email != '' DO NOTHING
        `;
        imported++;
      } catch (err: any) {
        skipped++;
      }
    }

    return res.status(200).json({ imported, skipped, total: leads.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
