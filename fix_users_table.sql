-- ==========================================
-- FIX: Create Users Profile Table
-- ==========================================

-- Create a public users table for profile data
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (but allow reads for authenticated users)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow anyone authenticated to read users (for dropdowns)
CREATE POLICY "Authenticated users can view all users" ON users
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (id = auth.uid());

-- ==========================================
-- Sync existing auth.users to public.users
-- ==========================================

-- This will insert any existing auth users into the public users table
INSERT INTO users (id, email, full_name)
SELECT 
  id, 
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)) as full_name
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, users.full_name);

-- ==========================================
-- Create trigger to auto-sync new users
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    new.id, 
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- DONE! Now assign user to a role:
-- ==========================================

-- Example: To assign "Juhi Sah" to a role, run:
-- 
-- INSERT INTO user_roles (user_id, role_id)
-- SELECT u.id, r.id FROM auth.users u, roles r
-- WHERE u.email = 'jsjuhi94@gmail.com' AND r.name = 'user';
