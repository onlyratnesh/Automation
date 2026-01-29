-- ==========================================
-- LEADS TABLE FOR CRM/SALES PIPELINE
-- ==========================================

-- Leads Table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source TEXT CHECK (source IN ('Facebook', 'Website', 'Referral', 'WhatsApp', 'Cold Call', 'Other')),
  status TEXT CHECK (status IN ('New', 'Contacted', 'Interested', 'Qualified', 'Lost', 'Converted')) DEFAULT 'New',
  assigned_to UUID,
  notes TEXT,
  follow_up_date DATE,
  priority TEXT CHECK (priority IN ('High', 'Medium', 'Low')) DEFAULT 'Medium',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL
);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- RLS Policy (Allow all for development - same as other tables)
CREATE POLICY "Allow all access for leads" ON leads
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(follow_up_date);
