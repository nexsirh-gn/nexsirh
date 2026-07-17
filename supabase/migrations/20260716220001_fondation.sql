-- ============================================================
-- 0001 — FONDATION : rôles, entreprises, profils, audit, helpers
-- ============================================================

create extension if not exists pgcrypto;

-- ----- Enum des rôles applicatifs -----
create type app_role as enum ('admin','rh','dg','manager','comptable','employe','super_admin');

-- ----- Entreprises (tenants) -----
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_form text,
  nif text,
  cnss_employer_number text,
  address text,
  city text,
  sector text,
  convention text default 'Convention Collective du Travail',
  bank_name text,
  bank_account text,
  status text not null default 'active' check (status in ('active','trial','suspended','read_only')),
  suspension_reason text,
  next_employee_seq int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----- Profils utilisateurs (liés à auth.users) -----
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id),
  role app_role not null default 'employe',
  employee_id uuid, -- fk ajoutée après création de employees
  full_name text not null,
  email text not null,
  phone text,
  active boolean not null default true,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint super_admin_sans_tenant check (role <> 'super_admin' or company_id is null),
  constraint tenant_requis check (role = 'super_admin' or company_id is not null)
);
create index on public.profiles (company_id);

-- ----- Journal d'audit (append-only, global) -----
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  actor_id uuid,
  actor_email text,
  action text not null,
  target_table text,
  target_id text,
  before_data jsonb,
  after_data jsonb,
  ip text,
  created_at timestamptz not null default now()
);
create index on public.audit_log (company_id, created_at desc);

-- ============================================================
-- HELPERS (security definer pour éviter la récursion RLS)
-- ============================================================
create or replace function public.current_company_id() returns uuid
language sql stable security definer set search_path = public as
$$ select company_id from profiles where id = auth.uid() $$;

create or replace function public.current_app_role() returns app_role
language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

create or replace function public.current_employee_id() returns uuid
language sql stable security definer set search_path = public as
$$ select employee_id from profiles where id = auth.uid() $$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select role = 'super_admin' from profiles where id = auth.uid()), false) $$;

create or replace function public.has_role(variadic roles app_role[]) returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select role = any(roles) from profiles where id = auth.uid()), false) $$;

-- ----- Trigger updated_at générique -----
create or replace function public.set_updated_at() returns trigger
language plpgsql as
$$ begin new.updated_at = now(); return new; end $$;

create trigger t_upd before update on public.companies for each row execute function set_updated_at();
create trigger t_upd before update on public.profiles for each row execute function set_updated_at();

-- ----- Trigger d'audit générique -----
create or replace function public.write_audit() returns trigger
language plpgsql security definer set search_path = public as
$$
declare v_company uuid; v_email text;
begin
  select email into v_email from profiles where id = auth.uid();
  v_company := coalesce(
    (to_jsonb(coalesce(new, old)) ->> 'company_id')::uuid,
    public.current_company_id()
  );
  insert into audit_log (company_id, actor_id, actor_email, action, target_table, target_id, before_data, after_data)
  values (
    v_company, auth.uid(), v_email, lower(tg_op), tg_table_name,
    coalesce(to_jsonb(coalesce(new, old)) ->> 'id', ''),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger t_audit after insert or update or delete on public.companies
  for each row execute function write_audit();

-- ============================================================
-- RLS
-- ============================================================
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_log enable row level security;

-- companies : chaque membre voit SA société ; admin la modifie ; super_admin tout
create policy companies_select on public.companies for select
  using (id = current_company_id() or is_super_admin());
create policy companies_update on public.companies for update
  using ((id = current_company_id() and has_role('admin','rh')) or is_super_admin());
create policy companies_insert on public.companies for insert
  with check (is_super_admin());
-- pas de delete (interdit absolu #9 : jamais de suppression de données client)

-- profiles : soi-même ; admin/rh de la société ; super_admin
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or (company_id = current_company_id() and has_role('admin','rh','dg')) or is_super_admin());
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or (company_id = current_company_id() and has_role('admin','rh')) or is_super_admin());
create policy profiles_insert on public.profiles for insert
  with check ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin());
create policy profiles_delete on public.profiles for delete
  using ((company_id = current_company_id() and has_role('admin')) or is_super_admin());

-- audit_log : lecture admin (sa société) + super_admin ; écriture uniquement par triggers (security definer)
create policy audit_select on public.audit_log for select
  using ((company_id = current_company_id() and has_role('admin','rh','dg')) or is_super_admin());
-- append-only : aucune policy insert/update/delete pour authenticated
revoke update, delete on public.audit_log from authenticated, anon;
