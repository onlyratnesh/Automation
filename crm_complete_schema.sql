-- ==========================================
-- CRM COMPLETE SCHEMA
-- Leads → Deals → Tasks → Activities → Payments
-- ==========================================

-- ==========================================
-- 1. ENHANCED LEADS TABLE
-- ==========================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_by UUID;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ==========================================
-- 2. DEALS TABLE (Revenue Opportunities)
-- ==========================================
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    
    amount NUMERIC NOT NULL DEFAULT 0,
    system_size_kw NUMERIC,
    
    stage TEXT NOT NULL DEFAULT 'Site Visit',
    probability INTEGER DEFAULT 20,
    
    expected_close_date DATE,
    actual_close_date DATE,
    actual_amount NUMERIC,
    
    assigned_to UUID,
    lost_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT deal_stage_check CHECK (
        stage = ANY (ARRAY[
            'Site Visit',
            'Quotation Sent',
            'Negotiation',
            'Awaiting Payment',
            'Closed Won',
            'Closed Lost'
        ])
    )
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_deals_updated_at ON deals;
CREATE TRIGGER update_deals_updated_at
    BEFORE UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deals_lead_id ON deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_to ON deals(assigned_to);


-- ==========================================
-- 3. TASKS TABLE (Responsibilities)
-- ==========================================
CREATE TABLE IF NOT EXISTS crm_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    notes TEXT,
    
    assigned_to UUID NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    reminder_at TIMESTAMPTZ,
    
    status TEXT DEFAULT 'Pending',
    priority TEXT DEFAULT 'Medium',
    
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT task_status_check CHECK (
        status = ANY (ARRAY['Pending', 'Completed', 'Cancelled'])
    ),
    CONSTRAINT task_priority_check CHECK (
        priority = ANY (ARRAY['High', 'Medium', 'Low'])
    )
);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_lead_id ON crm_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_deal_id ON crm_tasks(deal_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned_to ON crm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due_date ON crm_tasks(due_date);


-- ==========================================
-- 4. ACTIVITIES TABLE (Timeline History)
-- ==========================================
CREATE TABLE IF NOT EXISTS lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    task_id UUID REFERENCES crm_tasks(id) ON DELETE SET NULL,
    
    type TEXT NOT NULL,
    notes TEXT,
    outcome TEXT,
    duration_minutes INTEGER,
    
    contacted_by UUID NOT NULL,
    contacted_at TIMESTAMPTZ DEFAULT now(),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT activity_type_check CHECK (
        type = ANY (ARRAY[
            'Call', 'Email', 'Meeting', 'WhatsApp', 'Note', 'Site Visit', 'Payment Received'
        ])
    ),
    CONSTRAINT activity_outcome_check CHECK (
        outcome IS NULL OR outcome = ANY (ARRAY[
            'Positive', 'Negative', 'Neutral', 'No Answer'
        ])
    )
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_deal_id ON lead_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_contacted_at ON lead_activities(contacted_at);

-- Trigger: Auto-update leads.last_contacted_at when activity is added
CREATE OR REPLACE FUNCTION update_lead_last_contacted()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE leads
    SET last_contacted_at = NEW.contacted_at
    WHERE id = NEW.lead_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_lead_last_contacted ON lead_activities;
CREATE TRIGGER trigger_update_lead_last_contacted
    AFTER INSERT ON lead_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_last_contacted();


-- ==========================================
-- 5. PAYMENTS TABLE (Payment Tracking)
-- ==========================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    amount NUMERIC NOT NULL,
    payment_type TEXT NOT NULL DEFAULT 'Partial',
    payment_method TEXT,
    
    reference_number TEXT,
    notes TEXT,
    
    received_by UUID,
    received_at TIMESTAMPTZ DEFAULT now(),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT payment_type_check CHECK (
        payment_type = ANY (ARRAY[
            'Advance', 'Partial', 'Final', 'Full', 'Refund'
        ])
    ),
    CONSTRAINT payment_method_check CHECK (
        payment_method IS NULL OR payment_method = ANY (ARRAY[
            'Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Finance', 'Card'
        ])
    )
);

CREATE INDEX IF NOT EXISTS idx_payments_deal_id ON payments(deal_id);
CREATE INDEX IF NOT EXISTS idx_payments_lead_id ON payments(lead_id);


-- ==========================================
-- 6. RLS POLICIES
-- ==========================================
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Allow all for development (tighten later)
CREATE POLICY "Allow all deals" ON deals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all crm_tasks" ON crm_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all lead_activities" ON lead_activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all payments" ON payments FOR ALL USING (true) WITH CHECK (true);


-- ==========================================
-- DONE! Run this in Supabase SQL Editor
-- ==========================================
