import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '../../lib/db';
import { getAdminFromRequest } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return trackEvent(req, res);
  } else if (req.method === 'GET') {
    return getAnalytics(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function trackEvent(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { type, session_id, page, event_name, event_data, referrer } = req.body;

    if (type === 'page_view') {
      const userAgent = req.headers['user-agent']?.slice(0, 500) || '';
      await sql`
        INSERT INTO page_views (session_id, page, referrer, user_agent)
        VALUES (${session_id || 'unknown'}, ${page || '/'}, ${referrer || ''}, ${userAgent})
      `;
    } else if (type === 'event') {
      await sql`
        INSERT INTO analytics_events (session_id, event_name, event_data)
        VALUES (${session_id || 'unknown'}, ${event_name || 'unknown'}, ${JSON.stringify(event_data || {})})
      `;
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Analytics track error:', error);
    return res.status(200).json({ success: false }); // Don't block UX on analytics fails
  }
}

async function getAnalytics(req: NextApiRequest, res: NextApiResponse) {
  // Admin only
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const days = parseInt((req.query.days as string) || '30');
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Total visitors
    const totalViewsRes = await sql`
      SELECT COUNT(*)::int as count FROM page_views WHERE created_at >= ${cutoff}
    `;
    const totalViews = totalViewsRes[0].count;

    // Unique sessions
    const uniqueSessionsRes = await sql`
      SELECT COUNT(DISTINCT session_id)::int as count FROM page_views WHERE created_at >= ${cutoff}
    `;
    const uniqueSessions = uniqueSessionsRes[0].count;

    // Booking inquiries (booking_created events)
    const inquiriesRes = await sql`
      SELECT COUNT(*)::int as count FROM analytics_events
      WHERE event_name = 'booking_created' AND created_at >= ${cutoff}
    `;
    const inquiries = inquiriesRes[0].count;

    // Confirmed bookings
    const confirmedRes = await sql`
      SELECT COUNT(*)::int as count FROM bookings
      WHERE payment_status IN ('deposit_paid', 'fully_paid') AND created_at >= ${cutoff}
    `;
    const confirmed = confirmedRes[0].count;

    // Revenue
    const revenueRes = await sql`
      SELECT COALESCE(SUM(deposit_amount), 0)::bigint as total FROM bookings
      WHERE payment_status IN ('deposit_paid', 'fully_paid') AND created_at >= ${cutoff}
    `;
    const revenue = Number(revenueRes[0].total);

    // Top referrers
    const referrers = await sql`
      SELECT 
        COALESCE(NULLIF(referrer, ''), 'Direct') as source,
        COUNT(*)::int as visits
      FROM page_views
      WHERE created_at >= ${cutoff}
      GROUP BY source
      ORDER BY visits DESC
      LIMIT 6
    `;

    // Daily views for chart
    const dailyViews = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*)::int as views
      FROM page_views
      WHERE created_at >= ${cutoff}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Conversion rate
    const conversionRate = uniqueSessions > 0 ? ((inquiries / uniqueSessions) * 100).toFixed(1) : '0';

    return res.status(200).json({
      totalViews,
      uniqueSessions,
      inquiries,
      confirmed,
      revenue,
      conversionRate,
      referrers,
      dailyViews
    });
  } catch (error: any) {
    console.error('Analytics fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}
