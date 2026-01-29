-- 1. DELETE ORPHANS: Remove user_roles that point to users NOT in our public table
-- This is critical because you can't add the constraint if bad data exists!
delete from user_roles
where user_id not in (select id from users);

-- 2. Drop the constraint (if it exists)
alter table user_roles drop constraint if exists user_roles_user_id_fkey;

-- 3. Add the clean constraint
alter table user_roles
  add constraint user_roles_user_id_fkey
  foreign key (user_id)
  references users(id)
  on delete cascade;

-- 4. Verify Policy (Ensure one exists)
drop policy if exists "Enable all access for all users" on user_roles;
create policy "Enable all access for all users" on user_roles for all using (true) with check (true);
