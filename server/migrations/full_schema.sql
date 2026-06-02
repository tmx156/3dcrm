-- ==========================================
-- CRM FULL DATABASE SCHEMA
-- Run in Supabase SQL Editor or via pg client
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. USERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'booker' CHECK (role IN ('admin', 'booker', 'viewer')),
  leads_assigned INTEGER DEFAULT 0,
  bookings_made INTEGER DEFAULT 0,
  show_ups INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. LEADS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(100),
  email VARCHAR(255),
  postcode VARCHAR(50),
  image_url VARCHAR(1024),
  parent_phone VARCHAR(100),
  age INTEGER,
  booker_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'New' CHECK (status IN ('New', 'Assigned', 'Booked', 'Attended', 'Cancelled', 'Rejected', 'Wrong Number', 'No Answer', 'No Show')),
  date_booked TIMESTAMPTZ,
  booked_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ,
  booking_history JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  is_confirmed INTEGER DEFAULT 0,
  booking_status VARCHAR(50),
  ever_booked BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_ever_booked ON leads (ever_booked) WHERE ever_booked = TRUE;
CREATE INDEX IF NOT EXISTS idx_leads_booked_at ON leads (booked_at) WHERE booked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_booker_id ON leads (booker_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at);

-- ==========================================
-- 3. SALES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount DECIMAL(10,2),
  payment_method VARCHAR(100),
  payment_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'Completed',
  payment_status VARCHAR(50) DEFAULT 'Paid',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_lead_id ON sales (lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales (user_id);

-- ==========================================
-- 4. TEMPLATES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS templates (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(100),
  subject VARCHAR(500),
  email_body TEXT,
  sms_body TEXT,
  content TEXT,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  send_email BOOLEAN DEFAULT true,
  send_sms BOOLEAN DEFAULT false,
  reminder_days INTEGER DEFAULT 5,
  reminder_time VARCHAR(10) DEFAULT '09:00',
  email_account VARCHAR(100) DEFAULT 'primary',
  attachments JSONB DEFAULT '[]'::jsonb,
  variables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates (user_id);
CREATE INDEX IF NOT EXISTS idx_templates_email_account ON templates (email_account);

-- ==========================================
-- 5. MESSAGES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  template_id VARCHAR(255) REFERENCES templates(id) ON DELETE SET NULL,
  sent_by VARCHAR(255),
  type VARCHAR(50) CHECK (type IN ('email', 'sms')),
  subject VARCHAR(500),
  email_body TEXT,
  sms_body TEXT,
  content TEXT,
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  read_status BOOLEAN DEFAULT false,
  booking_date TIMESTAMPTZ,
  attachments JSONB DEFAULT '[]'::jsonb,
  gmail_message_id TEXT,
  gmail_account_key TEXT DEFAULT 'primary',
  imap_uid INTEGER,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_gmail_message_per_lead ON messages (gmail_message_id, lead_id) WHERE gmail_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_gmail_message_id ON messages (gmail_message_id) WHERE gmail_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON messages (lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages (sent_at);

-- ==========================================
-- 6. FINANCE TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS finance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  total_amount DECIMAL(10,2),
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  monthly_payment DECIMAL(10,2),
  payment_frequency VARCHAR(50) DEFAULT 'monthly',
  term_months INTEGER,
  interest_rate DECIMAL(5,2) DEFAULT 0,
  start_date DATE,
  next_payment_date DATE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'defaulted')),
  agreement_number VARCHAR(100) UNIQUE,
  total_paid DECIMAL(10,2) DEFAULT 0,
  remaining_balance DECIMAL(10,2),
  grace_period_days INTEGER DEFAULT 7,
  late_fee_amount DECIMAL(10,2) DEFAULT 0,
  email_reminders BOOLEAN DEFAULT true,
  sms_reminders BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_lead_id ON finance (lead_id);
CREATE INDEX IF NOT EXISTS idx_finance_sale_id ON finance (sale_id);
CREATE INDEX IF NOT EXISTS idx_finance_status ON finance (status);

-- ==========================================
-- 7. BOOKING_HISTORY TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS booking_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  performed_by_name VARCHAR(255),
  details JSONB DEFAULT '{}'::jsonb,
  lead_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_history_lead_id ON booking_history (lead_id);
CREATE INDEX IF NOT EXISTS idx_booking_history_timestamp ON booking_history (timestamp);

-- ==========================================
-- 8. GMAIL_ACCOUNTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS gmail_accounts (
  email TEXT PRIMARY KEY,
  access_token TEXT,
  refresh_token TEXT,
  expiry_date BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 9. PROCESSED_GMAIL_MESSAGES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS processed_gmail_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_key TEXT DEFAULT 'primary',
  gmail_message_id TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_key, gmail_message_id)
);

CREATE INDEX IF NOT EXISTS idx_processed_gmail_lookup ON processed_gmail_messages (account_key, gmail_message_id);

-- ==========================================
-- 10. BOOKER_ACTIVITY_LOG TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS booker_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  activity_type VARCHAR(100) NOT NULL,
  activity_details JSONB DEFAULT '{}'::jsonb,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booker_activity_user_id ON booker_activity_log (user_id);
CREATE INDEX IF NOT EXISTS idx_booker_activity_performed_at ON booker_activity_log (performed_at);

-- ==========================================
-- 11. DAILY_BOOKER_PERFORMANCE TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS daily_booker_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  performance_date DATE NOT NULL,
  leads_assigned INTEGER DEFAULT 0,
  leads_booked INTEGER DEFAULT 0,
  leads_attended INTEGER DEFAULT 0,
  sales_made INTEGER DEFAULT 0,
  total_sale_amount DECIMAL(10,2) DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  show_up_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, performance_date)
);

-- ==========================================
-- 12. MONTHLY_BOOKER_PERFORMANCE TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS monthly_booker_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  performance_month VARCHAR(7) NOT NULL,
  leads_assigned INTEGER DEFAULT 0,
  leads_booked INTEGER DEFAULT 0,
  leads_attended INTEGER DEFAULT 0,
  sales_made INTEGER DEFAULT 0,
  total_sale_amount DECIMAL(10,2) DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  show_up_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, performance_month)
);

-- ==========================================
-- 13. ENABLE ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_gmail_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE booker_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_booker_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_booker_performance ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 14. RLS POLICIES (allow service role full access)
-- ==========================================
CREATE POLICY "Service role full access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON finance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON booking_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON gmail_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON processed_gmail_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON booker_activity_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON daily_booker_performance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON monthly_booker_performance FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 15. STORAGE BUCKET FOR IMAGES
-- ==========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-images', 'lead-images', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- SCHEMA CREATION COMPLETE
-- ==========================================
