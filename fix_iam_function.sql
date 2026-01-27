-- Update has_permission to treat 'admin.access' as a super-permission
create or replace function has_permission(required_perm text)
returns boolean as $$
declare
  has_perm boolean;
begin
  -- 1. Check if user is Admin (Superuser)
  if exists (
    select 1
    from user_roles ur
    join role_permissions rp on ur.role_id = rp.role_id
    join permissions p on rp.permission_id = p.id
    where ur.user_id = auth.uid()
    and p.code = 'admin.access'
  ) then
    return true;
  end if;

  -- 2. Check for specific permission
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
