-- ==========================================
-- RELAX PIPELINE AUTH CONSTRAINTS FOR DEV
-- ==========================================

-- 1. DROP FK CONSTRAINTS (Allow User IDs that don't exist in auth.users)
ALTER TABLE pipelines DROP CONSTRAINT IF EXISTS pipelines_user_id_fkey;
ALTER TABLE pipeline_runs DROP CONSTRAINT IF EXISTS pipeline_runs_user_id_fkey;

-- 2. UPDATE RLS POLICIES TO ALLOW MOCK USER
-- The mock user ID for development is '00000000-0000-0000-0000-000000000000'

-- Drop existing restrictive policies first (if any specific ones block generic UUIDs)
DROP POLICY IF EXISTS "Users can insert their own pipelines" ON pipelines;
DROP POLICY IF EXISTS "Users can read their own pipelines" ON pipelines;
DROP POLICY IF EXISTS "Users can update their own pipelines" ON pipelines;

-- Re-create properly permissive policies for Dev
CREATE POLICY "Allow All For Dev" ON pipelines
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Runs policies
DROP POLICY IF EXISTS "Users can see runs for their pipelines" ON pipeline_runs;
DROP POLICY IF EXISTS "Users can trigger runs for their pipelines" ON pipeline_runs;

CREATE POLICY "Allow All Runs For Dev" ON pipeline_runs
  FOR ALL
  USING (true)
  WITH CHECK (true);
