-- 1. Drop the incorrect constraint that points to auth.users (likely)
alter table user_roles drop constraint if exists user_roles_user_id_fkey;

-- 2. Add the correct constraint pointing to our PUBLIC users table
alter table user_roles
  add constraint user_roles_user_id_fkey
  foreign key (user_id)
  references users(id)
  on delete cascade;

-- 3. Just in case, verify RLS is still permissive
create policy "Enable all access for all users" on user_roles for all using (true) with check (true);
