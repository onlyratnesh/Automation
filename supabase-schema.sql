-- Enable functionality
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. IAM System (RBAC + ABAC)
-- ==========================================

-- Permissions Table: Granular actions
create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, -- e.g., 'pipelines.create'
  description text
);

-- Roles Table: e.g., 'admin', 'bot', 'user'
create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text
);

-- Role-Permissions Mapping
create table if not exists role_permissions (
  role_id uuid references roles(id) on delete cascade,
  permission_id uuid references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- User-Roles Mapping (RBAC)
create table if not exists user_roles (
  user_id uuid references auth.users(id) on delete cascade,
  role_id uuid references roles(id) on delete cascade,
  primary key (user_id, role_id)
);

-- Seed Default Data (Idempotent)
do $$
declare
  admin_role_id uuid;
  user_role_id uuid;
  bot_role_id uuid;
  perm_create_id uuid;
  perm_read_id uuid;
  perm_manage_id uuid;
  perm_admin_id uuid;
begin
  -- Create Permissions
  insert into permissions (code, description) values
    ('pipelines.create', 'Can create new pipelines'),
    ('pipelines.read', 'Can read pipelines (subject to ownership)'),
    ('pipelines.manage', 'Can manage all pipelines'),
    ('admin.access', 'Full system access')
  on conflict (code) do nothing;

  -- Get Permission IDs
  select id into perm_create_id from permissions where code = 'pipelines.create';
  select id into perm_read_id from permissions where code = 'pipelines.read';
  select id into perm_manage_id from permissions where code = 'pipelines.manage';
  select id into perm_admin_id from permissions where code = 'admin.access';

  -- Create Roles
  insert into roles (name, description) values
    ('admin', 'System Administrator'),
    ('bot', 'Automated Agent'),
    ('user', 'Regular User')
  on conflict (name) do nothing;

  -- Get Role IDs
  select id into admin_role_id from roles where name = 'admin';
  select id into user_role_id from roles where name = 'user';
  select id into bot_role_id from roles where name = 'bot';

  -- Assign Permissions to Roles
  insert into role_permissions (role_id, permission_id) values
    (admin_role_id, perm_admin_id),
    (bot_role_id, perm_manage_id),
    (user_role_id, perm_create_id),
    (user_role_id, perm_read_id)
  on conflict (role_id, permission_id) do nothing;
end $$;


-- ==========================================
-- 2. Helper Functions for RLS
-- ==========================================

-- Function to check if a user has a specific permission
create or replace function has_permission(required_perm text)
returns boolean as $$
declare
  has_perm boolean;
begin
  select exists (
    select 1
    from user_roles ur
    join role_permissions rp on ur.role_id = rp.role_id
    join permissions p on rp.permission_id = p.id
    where ur.user_id = auth.uid()
    and p.code = required_perm
  ) into has_perm;

  return has_perm;
end;
$$ language plpgsql security definer;

-- Function to check if user is admin (shortcut)
create or replace function is_admin()
returns boolean as $$
begin
  return has_permission('admin.access');
end;
$$ language plpgsql security definer;


-- ==========================================
-- 3. App Tables (Pipelines & Runs)
-- ==========================================

-- Pipelines
create table if not exists pipelines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null default auth.uid(),
  name text not null,
  definition jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Pipeline Runs
create table if not exists pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid references pipelines(id) on delete cascade,
  user_id uuid references auth.users(id) not null default auth.uid(),
  status text not null check (status in ('queued', 'running', 'completed', 'failed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Logs (No user_id needed, inferred from run)
create table if not exists pipeline_run_logs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references pipeline_runs(id) on delete cascade,
  timestamp timestamptz default now(),
  message text not null
);

-- Indexes
create index if not exists idx_pipelines_user_id on pipelines(user_id);
create index if not exists idx_pipeline_runs_pipeline_id on pipeline_runs(pipeline_id);
create index if not exists idx_pipeline_runs_user_id on pipeline_runs(user_id);


-- ==========================================
-- 4. RLS Policies
-- ==========================================

alter table pipelines enable row level security;
alter table pipeline_runs enable row level security;
alter table pipeline_run_logs enable row level security;

-- Pipelines Policy
create policy "Admins and Bots have full control" on pipelines
  for all using ( has_permission('admin.access') or has_permission('pipelines.manage') );

create policy "Users can read their own pipelines" on pipelines
  for select using ( has_permission('pipelines.read') and user_id = auth.uid() );

create policy "Users can insert their own pipelines" on pipelines
  for insert with check ( has_permission('pipelines.create') and user_id = auth.uid() );

create policy "Users can update their own pipelines" on pipelines
  for update using ( has_permission('pipelines.create') and user_id = auth.uid() );

create policy "Users can delete their own pipelines" on pipelines
  for delete using ( has_permission('pipelines.create') and user_id = auth.uid() );

-- Runs Policy
create policy "Admins and Bots have full control runs" on pipeline_runs
  for all using ( has_permission('admin.access') or has_permission('pipelines.manage') );

create policy "Users can see runs for their pipelines" on pipeline_runs
  for select using (
    exists ( select 1 from pipelines p where p.id = pipeline_runs.pipeline_id and p.user_id = auth.uid() )
  );

create policy "Users can trigger runs for their pipelines" on pipeline_runs
  for insert with check (
    has_permission('pipelines.create') and
    exists ( select 1 from pipelines p where p.id = pipeline_runs.pipeline_id and p.user_id = auth.uid() )
  );

-- Logs Policy
create policy "Admins and Bots have full control logs" on pipeline_run_logs
  for all using ( has_permission('admin.access') or has_permission('pipelines.manage') );

create policy "Users can see logs for their runs" on pipeline_run_logs
  for select using (
    exists (
      select 1 from pipeline_runs r
      join pipelines p on r.pipeline_id = p.id
      where r.id = pipeline_run_logs.run_id and p.user_id = auth.uid()
    )
  );


-- ==========================================
-- 5. Realtime
-- ==========================================
alter publication supabase_realtime add table pipeline_runs;
alter publication supabase_realtime add table pipeline_run_logs;


-- ==========================================
-- 6. Secure IAM Tables
-- ==========================================
-- Protect the IAM system itself from tampering
alter table permissions enable row level security;
alter table roles enable row level security;
alter table role_permissions enable row level security;
alter table user_roles enable row level security;

-- Admins can do everything on IAM tables
create policy "Admins manage permissions" on permissions
  for all using ( is_admin() );

create policy "Admins manage roles" on roles
  for all using ( is_admin() );

create policy "Admins manage role_permissions" on role_permissions
  for all using ( is_admin() );

create policy "Admins manage user_roles" on user_roles
  for all using ( is_admin() );

-- Everyone can read permissions/roles (needed for the helper functions/UI)
-- But helper functions use SECURITY DEFINER, so we might not strictly need public read for the functions.
-- However, frontend checking often needs to know "What is my role?".
create policy "Everyone can read roles" on roles for select using (true);
create policy "Everyone can read permissions" on permissions for select using (true);
create policy "Users can read own roles" on user_roles 
  for select using ( user_id = auth.uid() );
