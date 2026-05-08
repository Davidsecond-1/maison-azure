-- ============================================
-- OUTREACH ADD-ON: Database Migration
-- Run this in Neon SQL Editor AFTER initial schema.sql
-- ============================================

-- Leads: apartment owners and managers in your pipeline
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  business_name VARCHAR(200) NOT NULL,
  contact_name VARCHAR(200),
  email VARCHAR(200),
  phone VARCHAR(50),
  whatsapp VARCHAR(50),
  instagram VARCHAR(100),
  website VARCHAR(300),
  location VARCHAR(100),
  city VARCHAR(50) DEFAULT 'Lagos',
  property_type VARCHAR(50) DEFAULT 'short_let', -- short_let, serviced_apartment, hotel
  source VARCHAR(50), -- propertypro, spleet, instagram, npc, manual
  source_url VARCHAR(500),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'new', -- new, contacted, opened, replied, qualified, closed_won, closed_lost
  last_contacted_at TIMESTAMP,
  reply_received_at TIMESTAMP,
  email_open_count INTEGER DEFAULT 0,
  email_last_opened_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_unique_email ON leads(email) WHERE email IS NOT NULL AND email != '';

-- Email campaigns: each individual email sent
CREATE TABLE IF NOT EXISTS email_campaigns (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
  template_key VARCHAR(50), -- opener, followup_1, followup_2, post_demo
  subject VARCHAR(500),
  body TEXT,
  resend_email_id VARCHAR(100), -- Resend's tracking ID
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, opened, clicked, replied, bounced, failed
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  first_opened_at TIMESTAMP,
  last_opened_at TIMESTAMP,
  open_count INTEGER DEFAULT 0,
  clicked_at TIMESTAMP,
  bounced_at TIMESTAMP,
  error_message TEXT,
  scheduled_for TIMESTAMP, -- For scheduled follow-ups
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_lead ON email_campaigns(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON email_campaigns(scheduled_for) WHERE scheduled_for IS NOT NULL;

-- Email events: every open, click, etc. (for detailed analytics)
CREATE TABLE IF NOT EXISTS email_events (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES email_campaigns(id) ON DELETE CASCADE,
  event_type VARCHAR(50), -- opened, clicked, bounced, complained, delivered
  user_agent TEXT,
  ip_address VARCHAR(50),
  link_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_events_campaign ON email_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);

-- Outreach settings (your sender info, defaults)
INSERT INTO site_settings (key, value) VALUES
  ('outreach_from_name', 'Your Name'),
  ('outreach_from_email', 'hello@yourdomain.com'),
  ('outreach_reply_to', 'hello@yourdomain.com'),
  ('outreach_signature', '\n\nBest,\n[Your Name]\n[Your Phone]\n[Your Demo URL]'),
  ('outreach_demo_url', 'https://maison-azure-wine.vercel.app'),
  ('outreach_daily_limit', '40'),
  ('outreach_followup_1_days', '3'),
  ('outreach_followup_2_days', '7')
ON CONFLICT (key) DO NOTHING;
