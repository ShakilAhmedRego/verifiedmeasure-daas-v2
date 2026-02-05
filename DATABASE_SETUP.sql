-- ============================================================
-- VERIFIEDMEASURE — DATABASE SETUP (AUTHORITATIVE)
-- ============================================================

-- Extensions
create extension if not exists pgcrypto;

-- Clean slate
drop table if exists audit_log cascade;
drop table if exists credit_ledger cascade;
drop table if exists lead_access cascade;
drop table if exists leads cascade;
drop table if exists user_profiles cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.get_user_balance(uuid) cascade;
drop function if exists public.handle_new_user() cascade;

-- ============================================================
-- TABLES
-- ============================================================

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user','admin')),
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  website text,
  email text,
  phone text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.lead_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, lead_id)
);

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  reason text not null,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES (DEPLOY-SAFE, UI+API OPTIMIZED)
-- ============================================================

create index if not exists idx_leads_created_at on public.leads (created_at desc);
create index if not exists idx_leads_company on public.leads (company);
create index if not exists idx_leads_email on public.leads (email);
create index if not exists idx_leads_meta_gin on public.leads using gin (meta);

create index if not exists idx_lead_access_user_lead on public.lead_access (user_id, lead_id);
create index if not exists idx_lead_access_lead_user on public.lead_access (lead_id, user_id);
create index if not exists idx_lead_access_created_at on public.lead_access (created_at desc);

create index if not exists idx_credit_ledger_user_created on public.credit_ledger (user_id, created_at desc);

create index if not exists idx_audit_log_actor_created on public.audit_log (actor_id, created_at desc);
create index if not exists idx_audit_log_entity_created on public.audit_log (entity, created_at desc);

create index if not exists idx_user_profiles_role_status on public.user_profiles (role, status);

-- ============================================================
-- FUNCTIONS (LOCKED)
-- ============================================================

create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  return exists (
    select 1
    from public.user_profiles
    where user_id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
end;
$$;

create or replace function public.get_user_balance(in_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  balance integer;
begin
  if auth.uid() != in_user_id and not public.is_admin() then
    raise exception 'Access denied';
  end if;

  select coalesce(sum(delta), 0)
    into balance
  from public.credit_ledger
  where user_id = in_user_id;

  return balance;
end;
$$;

-- Auto-provision user_profiles on signup (prevents profile missing failures)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, role, status)
  values (new.id, 'user', 'active')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (PREVIEW + ENTITLEMENT)
-- ============================================================

alter table public.user_profiles enable row level security;
alter table public.leads enable row level security;
alter table public.lead_access enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.audit_log enable row level security;

-- user_profiles
drop policy if exists user_profiles_select_own on public.user_profiles;
create policy user_profiles_select_own
on public.user_profiles
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists user_profiles_insert_own on public.user_profiles;
create policy user_profiles_insert_own
on public.user_profiles
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists user_profiles_admin_all on public.user_profiles;
create policy user_profiles_admin_all
on public.user_profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- leads (CRITICAL FIX: previewable pool)
drop policy if exists leads_select_all_authenticated on public.leads;
create policy leads_select_all_authenticated
on public.leads
for select
to authenticated
using (true);

drop policy if exists leads_admin_insert on public.leads;
create policy leads_admin_insert
on public.leads
for insert
to authenticated
with check (public.is_admin());

drop policy if exists leads_admin_update on public.leads;
create policy leads_admin_update
on public.leads
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists leads_admin_delete on public.leads;
create policy leads_admin_delete
on public.leads
for delete
to authenticated
using (public.is_admin());

-- lead_access (entitlement rows)
drop policy if exists lead_access_select_own on public.lead_access;
create policy lead_access_select_own
on public.lead_access
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists lead_access_insert_own on public.lead_access;
create policy lead_access_insert_own
on public.lead_access
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists lead_access_admin_all on public.lead_access;
create policy lead_access_admin_all
on public.lead_access
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- credit_ledger (append-only)
drop policy if exists credit_ledger_select_own on public.credit_ledger;
create policy credit_ledger_select_own
on public.credit_ledger
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists credit_ledger_insert_own on public.credit_ledger;
create policy credit_ledger_insert_own
on public.credit_ledger
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists credit_ledger_admin_all on public.credit_ledger;
create policy credit_ledger_admin_all
on public.credit_ledger
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- audit_log (append-only)
drop policy if exists audit_log_select_own on public.audit_log;
create policy audit_log_select_own
on public.audit_log
for select
to authenticated
using (actor_id = auth.uid() or public.is_admin());

drop policy if exists audit_log_insert_own on public.audit_log;
create policy audit_log_insert_own
on public.audit_log
for insert
to authenticated
with check (actor_id = auth.uid());

drop policy if exists audit_log_admin_all on public.audit_log;
create policy audit_log_admin_all
on public.audit_log
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ============================================================
-- SEED DATA (DEMO ONLY)
-- ============================================================

insert into public.leads (company, website, email, phone, meta)
select
  'Company ' || n,
  'company' || n || '.example.com',
  'contact' || n || '@example.com',
  '+1 (555) 0' || lpad(n::text, 4, '0') || '-' || lpad(n::text, 4, '0'),
  jsonb_build_object(
    'id', 'VM-' || lpad(n::text, 5, '0'),
    'industry', case when n % 3 = 0 then 'SaaS' when n % 3 = 1 then 'Consumer' else 'Enterprise' end,
    'location', case when n % 4 = 0 then 'WA' when n % 4 = 1 then 'TX' when n % 4 = 2 then 'CA' else 'NY' end,
    'size', case when n % 3 = 0 then 'Small' when n % 3 = 1 then 'Medium' else 'Large' end
  )
from generate_series(1, 250) as n;
