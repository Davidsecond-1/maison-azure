-- ===========================================
-- MAISON AZURE - DATABASE SCHEMA
-- Run this once in Neon/Vercel Postgres console
-- ===========================================

-- Bookings: every reservation request
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  reference VARCHAR(50) UNIQUE NOT NULL,
  guest_name VARCHAR(200) NOT NULL,
  guest_email VARCHAR(200) NOT NULL,
  guest_phone VARCHAR(50) NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guest_count INTEGER NOT NULL DEFAULT 1,
  nights INTEGER NOT NULL,
  nightly_rate INTEGER NOT NULL,
  cleaning_fee INTEGER NOT NULL DEFAULT 45000,
  total_amount INTEGER NOT NULL,
  deposit_amount INTEGER NOT NULL,
  special_requests TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid', -- unpaid, deposit_paid, fully_paid, refunded
  paystack_reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(reference);

-- Blocked dates: owner can manually block dates (for personal use, maintenance, etc)
CREATE TABLE IF NOT EXISTS blocked_dates (
  id SERIAL PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Page views & analytics
CREATE TABLE IF NOT EXISTS page_views (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100),
  page VARCHAR(100),
  referrer VARCHAR(500),
  user_agent TEXT,
  ip_country VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id);

-- Events (button clicks, form submissions)
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100),
  event_name VARCHAR(100),
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_created ON analytics_events(created_at);

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  name VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Site settings (editable from admin dashboard)
CREATE TABLE IF NOT EXISTS site_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Default settings
INSERT INTO site_settings (key, value) VALUES
  ('property_name', 'Maison Azure'),
  ('property_tagline', 'An intimate residence on the lagoon'),
  ('property_location', 'Banana Island, Lagos'),
  ('nightly_rate', '485000'),
  ('cleaning_fee', '45000'),
  ('weekly_discount', '10'),
  ('monthly_discount', '20'),
  ('min_nights', '2'),
  ('max_guests', '6'),
  ('contact_phone', '+234 803 000 0000'),
  ('contact_email', 'stay@maisonazure.ng'),
  ('contact_whatsapp', '2348030000000'),
  ('owner_email', 'owner@maisonazure.ng')
ON CONFLICT (key) DO NOTHING;

-- ===========================================
-- AFTER RUNNING THIS SCHEMA, CREATE YOUR ADMIN USER:
-- ===========================================
-- 1. Visit: yoursite.vercel.app/api/setup?email=youremail@example.com&password=YourStrongPassword123
-- 2. This creates the first admin (only works if no admin exists)
-- 3. Then login at: yoursite.vercel.app/admin/login
