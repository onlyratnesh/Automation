-- Create public users table (simulating IAM directory)
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  full_name text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table users enable row level security;

-- Allow all access for development (simulating public directory)
create policy "Enable all access for all users"
on users
for all
using (true)
with check (true);
