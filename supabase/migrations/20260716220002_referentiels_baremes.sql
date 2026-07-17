-- ============================================================
-- 0002 — RÉFÉRENTIELS D'ENTREPRISE + BARÈMES LÉGAUX VERSIONNÉS
-- ============================================================

-- ----- Départements -----
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);
create index on public.departments (company_id);

-- ----- Postes -----
create table public.positions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  title text not null,
  category text not null default 'Employé' check (category in ('Employé','Cadre','Cadre Supérieur')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.positions (company_id);

-- ----- Types de contrats -----
create table public.contract_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  code text not null,          -- CDI, CDD, STAGE…
  name text not null,
  max_months int,              -- CDD ≤ 24 mois
  requires_end_date boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

-- ----- Types d'absences -----
create table public.leave_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  code text not null,          -- CA, CM, CMAT, PERM, ANJ…
  name text not null,
  paid boolean not null default true,
  entitlement_days numeric,    -- ex. CMAT = 98
  deducts_balance boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

-- ----- Types de primes & indemnités -----
create table public.premium_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  code text not null,
  name text not null,
  taxable_rts boolean not null default true,   -- imposable RTS ?
  subject_cnss boolean not null default true,  -- soumise CNSS ?
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

-- ----- Jours fériés guinéens (GLOBALE, par année) -----
create table public.public_holidays (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  holiday_date date not null,
  name text not null,
  variable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year, holiday_date)
);

-- ----- Barème RTS versionné (GLOBALE) — tranches sur le net imposable -----
create table public.tax_brackets (
  id uuid primary key default gen_random_uuid(),
  version_ref text not null,          -- ex. v2026.1
  effective_from date not null,
  effective_to date,
  bracket_order int not null,
  lower_bound bigint not null,        -- GNF
  upper_bound bigint,                 -- null = sans plafond
  rate numeric not null,              -- ex. 0.05
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (version_ref, bracket_order)
);

-- ----- Cotisations sociales versionnées (GLOBALE) -----
create table public.contribution_rates (
  id uuid primary key default gen_random_uuid(),
  version_ref text not null,
  effective_from date not null,
  effective_to date,
  code text not null check (code in ('cnss','vf','cfpa')),
  employee_rate numeric not null default 0,
  employer_rate numeric not null default 0,
  ceiling bigint,                      -- plafond CNSS 2 500 000
  -- ⚠ Assiette VF (CLAUDE.md §6.5 — À CONFIRMER, arbitrage humain requis)
  abatement_type text check (abatement_type in ('fixed','percent')),
  abatement_value numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (version_ref, code)
);

-- ----- Triggers -----
create trigger t_upd before update on public.departments for each row execute function set_updated_at();
create trigger t_upd before update on public.positions for each row execute function set_updated_at();
create trigger t_upd before update on public.contract_types for each row execute function set_updated_at();
create trigger t_upd before update on public.leave_types for each row execute function set_updated_at();
create trigger t_upd before update on public.premium_types for each row execute function set_updated_at();
create trigger t_upd before update on public.public_holidays for each row execute function set_updated_at();
create trigger t_upd before update on public.tax_brackets for each row execute function set_updated_at();
create trigger t_upd before update on public.contribution_rates for each row execute function set_updated_at();

-- Audit sur les barèmes (CLAUDE.md §5.5)
create trigger t_audit after insert or update or delete on public.tax_brackets
  for each row execute function write_audit();
create trigger t_audit after insert or update or delete on public.contribution_rates
  for each row execute function write_audit();

-- ============================================================
-- RLS
-- ============================================================
alter table public.departments enable row level security;
alter table public.positions enable row level security;
alter table public.contract_types enable row level security;
alter table public.leave_types enable row level security;
alter table public.premium_types enable row level security;
alter table public.public_holidays enable row level security;
alter table public.tax_brackets enable row level security;
alter table public.contribution_rates enable row level security;

-- Référentiels tenant : lecture pour tous les membres, écriture admin/rh
do $$
declare t text;
begin
  foreach t in array array['departments','positions','contract_types','leave_types','premium_types']
  loop
    execute format('create policy %I_select on public.%I for select using (company_id = current_company_id() or is_super_admin())', t, t);
    execute format('create policy %I_insert on public.%I for insert with check ((company_id = current_company_id() and has_role(''admin'',''rh'')) or is_super_admin())', t, t);
    execute format('create policy %I_update on public.%I for update using ((company_id = current_company_id() and has_role(''admin'',''rh'')) or is_super_admin())', t, t);
    execute format('create policy %I_delete on public.%I for delete using ((company_id = current_company_id() and has_role(''admin'')) or is_super_admin())', t, t);
  end loop;
end $$;

-- Globales : lecture pour tout utilisateur authentifié, écriture super_admin uniquement
do $$
declare t text;
begin
  foreach t in array array['public_holidays','tax_brackets','contribution_rates']
  loop
    execute format('create policy %I_select on public.%I for select using (auth.uid() is not null)', t, t);
    execute format('create policy %I_insert on public.%I for insert with check (is_super_admin())', t, t);
    execute format('create policy %I_update on public.%I for update using (is_super_admin())', t, t);
    execute format('create policy %I_delete on public.%I for delete using (is_super_admin())', t, t);
  end loop;
end $$;
