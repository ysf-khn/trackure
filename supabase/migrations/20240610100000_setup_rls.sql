-- Migration to set up Row Level Security (RLS) for multi-tenancy

-- Helper function to get the current user's organization_id from their profile
create or replace function public.get_my_organization_id()
returns uuid
language sql stable
as $$
  select organization_id
  from public.profiles
  where id = auth.uid();
$$;

-- Enable RLS and apply policies for tenant-specific tables

-- profiles: Users can see/edit their own profile.
-- Note: INSERT/DELETE might need adjustments based on signup/admin flows.
alter table public.profiles enable row level security;
drop policy if exists "Allow individual read access" on public.profiles;
create policy "Allow individual read access"
  on public.profiles for select
  using (auth.uid() = id);
drop policy if exists "Allow individual update access" on public.profiles;
create policy "Allow individual update access"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
-- Consider INSERT/DELETE policies carefully based on application logic.
-- Example INSERT: create policy "Allow individual insert access" on public.profiles for insert with check (auth.uid() = id);

-- organizations: Users can see/update their own organization details.
-- Note: INSERT/DELETE likely restricted (e.g., admin only).
alter table public.organizations enable row level security;
drop policy if exists "Allow org members read access" on public.organizations;
create policy "Allow org members read access"
  on public.organizations for select
  using (id = public.get_my_organization_id());
drop policy if exists "Allow org members update access" on public.organizations;
create policy "Allow org members update access"
  on public.organizations for update
  using (id = public.get_my_organization_id()) with check (id = public.get_my_organization_id());
-- INSERT/DELETE policies omitted; likely requires admin privileges.

-- workflow_stages: Access own org's stages or default stages.
alter table public.workflow_stages enable row level security;
drop policy if exists "Allow access to org and default stages" on public.workflow_stages;
create policy "Allow access to org and default stages"
  on public.workflow_stages for select
  using (organization_id = public.get_my_organization_id() or (is_default = true and organization_id is null));
drop policy if exists "Allow insert for org-specific stages" on public.workflow_stages;
create policy "Allow insert for org-specific stages"
  on public.workflow_stages for insert
  with check (organization_id = public.get_my_organization_id() and is_default = false);
drop policy if exists "Allow update for org-specific stages" on public.workflow_stages;
create policy "Allow update for org-specific stages"
  on public.workflow_stages for update
  using (organization_id = public.get_my_organization_id() and is_default = false)
  with check (organization_id = public.get_my_organization_id() and is_default = false);
drop policy if exists "Allow delete for org-specific stages" on public.workflow_stages;
create policy "Allow delete for org-specific stages"
  on public.workflow_stages for delete
  using (organization_id = public.get_my_organization_id() and is_default = false);

-- workflow_sub_stages: Access own org's sub-stages or default sub-stages.
alter table public.workflow_sub_stages enable row level security;
drop policy if exists "Allow access to org and default sub-stages" on public.workflow_sub_stages;
create policy "Allow access to org and default sub-stages"
  on public.workflow_sub_stages for select
  using (organization_id = public.get_my_organization_id() or (is_default = true and organization_id is null));
drop policy if exists "Allow insert for org-specific sub-stages" on public.workflow_sub_stages;
create policy "Allow insert for org-specific sub-stages"
  on public.workflow_sub_stages for insert
  with check (organization_id = public.get_my_organization_id() and is_default = false);
drop policy if exists "Allow update for org-specific sub-stages" on public.workflow_sub_stages;
create policy "Allow update for org-specific sub-stages"
  on public.workflow_sub_stages for update
  using (organization_id = public.get_my_organization_id() and is_default = false)
  with check (organization_id = public.get_my_organization_id() and is_default = false);
drop policy if exists "Allow delete for org-specific sub-stages" on public.workflow_sub_stages;
create policy "Allow delete for org-specific sub-stages"
  on public.workflow_sub_stages for delete
  using (organization_id = public.get_my_organization_id() and is_default = false);

-- Generic Tenant Policy Macro (replace <TABLE_NAME>)
-- Apply this pattern to: orders, items, item_history, remarks, item_master

-- Template (-- Replace <TABLE_NAME> below) --
-- alter table public.<TABLE_NAME> enable row level security;
-- drop policy if exists "Allow org members full access" on public.<TABLE_NAME>;
-- create policy "Allow org members full access"
--   on public.<TABLE_NAME> for all
--   using (organization_id = public.get_my_organization_id())
--   with check (organization_id = public.get_my_organization_id());

-- Applying to orders
alter table public.orders enable row level security;
drop policy if exists "Allow org members full access on orders" on public.orders;
create policy "Allow org members full access on orders"
  on public.orders for all
  using (organization_id = public.get_my_organization_id())
  with check (organization_id = public.get_my_organization_id());

-- Applying to items
alter table public.items enable row level security;
drop policy if exists "Allow org members full access on items" on public.items;
create policy "Allow org members full access on items"
  on public.items for all
  using (organization_id = public.get_my_organization_id())
  with check (organization_id = public.get_my_organization_id());

-- Applying to item_history
alter table public.item_history enable row level security;
drop policy if exists "Allow org members full access on item_history" on public.item_history;
create policy "Allow org members full access on item_history"
  on public.item_history for all
  using (organization_id = public.get_my_organization_id())
  with check (organization_id = public.get_my_organization_id());

-- Applying to remarks
alter table public.remarks enable row level security;
drop policy if exists "Allow org members full access on remarks" on public.remarks;
create policy "Allow org members full access on remarks"
  on public.remarks for all
  using (organization_id = public.get_my_organization_id())
  with check (organization_id = public.get_my_organization_id());

-- Applying to item_master
alter table public.item_master enable row level security;
drop policy if exists "Allow org members full access on item_master" on public.item_master;
create policy "Allow org members full access on item_master"
  on public.item_master for all
  using (organization_id = public.get_my_organization_id())
  with check (organization_id = public.get_my_organization_id()); 