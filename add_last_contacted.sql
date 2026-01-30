-- ==========================================
-- ADD last_contacted_at COLUMN TO LEADS
-- ==========================================

-- Add the new column
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

-- Optional: Set initial value for existing leads to created_at
-- UPDATE leads SET last_contacted_at = created_at WHERE last_contacted_at IS NULL;
