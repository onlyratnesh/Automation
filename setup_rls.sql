-- Enable RLS (if not already)
alter table roles enable row level security;
alter table user_roles enable row level security;

-- POLICY: Roles (Allow ALL for now for development)
create policy "Enable all access for all users"
on roles
for all
using (true)
with check (true);

-- POLICY: User Roles (Allow ALL for now for development)
create policy "Enable all access for all users"
on user_roles
for all
using (true)
with check (true);

-- Make sure tables exist if they don't
create table if not exists roles (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists user_roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null, -- references auth.users or public.users
  role_id uuid references roles(id) on delete cascade not null,
  created_at timestamptz default now()
);
