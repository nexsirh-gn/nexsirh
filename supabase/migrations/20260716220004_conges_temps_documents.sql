-- ============================================================
-- 0004 — CONGÉS & ABSENCES, TEMPS & PRÉSENCE, DOCUMENTS
-- ============================================================

-- ----- Demandes de congés (workflow Manager → RH) -----
create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  employee_id uuid not null references public.employees(id),
  leave_type_id uuid references public.leave_types(id),
  leave_type_code text not null,
  start_date date not null,
  end_date date not null,
  working_days numeric not null,     -- jours ouvrables calculés (week-ends + fériés exclus)
  comment text,
  attachment_path text,
  status text not null default 'attente_manager' check (status in
    ('attente_manager','attente_rh','approuve','refuse','annule')),
  manager_decision_by uuid,
  manager_decision_at timestamptz,
  rh_decision_by uuid,
  rh_decision_at timestamptz,
  refusal_reason text,               -- obligatoire en cas de refus (contrainte)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dates_coherentes check (end_date >= start_date),
  constraint motif_refus_obligatoire check (status <> 'refuse' or refusal_reason is not null)
);
create index on public.leave_requests (company_id, status);
create index on public.leave_requests (employee_id);

-- ----- Soldes de congés -----
create table public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  employee_id uuid not null references public.employees(id),
  year int not null,
  entitled_days numeric not null default 0,     -- 2,5 j/mois travaillé
  seniority_bonus_days numeric not null default 0, -- +1 j / tranche de 5 ans
  carryover_days numeric not null default 0,    -- report N-1
  taken_days numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, year)
);
create index on public.leave_balances (company_id, year);

-- ----- Feuilles de temps mensuelles -----
create table public.timesheets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  employee_id uuid not null references public.employees(id),
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  total_hours numeric not null default 0,
  overtime_25 numeric not null default 0,
  overtime_50 numeric not null default 0,
  overtime_100 numeric not null default 0,
  overtime_amount bigint not null default 0,  -- GNF, calculé (base 173,33 h)
  status text not null default 'a_valider' check (status in ('a_valider','valide','transmis_paie')),
  validated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, period_year, period_month)
);
create index on public.timesheets (company_id, period_year, period_month);

-- ----- Pointages journaliers -----
create table public.timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  work_date date not null,
  time_in time,
  time_out time,
  hours numeric not null default 0,
  overtime_hours numeric not null default 0,
  overtime_rate int check (overtime_rate in (25, 50, 100)),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.timesheet_entries (timesheet_id);

-- ----- Documents générés (métadonnées + chemin Storage) -----
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  employee_id uuid references public.employees(id),
  doc_type text not null check (doc_type in
    ('bulletin','journal_paie','attestation_travail','certificat_travail','certificat_conge',
     'solde_tout_compte','contrat','registre_personnel','declaration_cnss','etat_rts',
     'etat_salaires','suivi_conges','fiche_individuelle','facture','autre')),
  category text not null default 'rh' check (category in ('rh','paie','legal','abonnement')),
  title text not null,
  period text,
  storage_path text,
  generated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.documents (company_id, doc_type);
create index on public.documents (employee_id);

-- ----- Triggers -----
create trigger t_upd before update on public.leave_requests for each row execute function set_updated_at();
create trigger t_upd before update on public.leave_balances for each row execute function set_updated_at();
create trigger t_upd before update on public.timesheets for each row execute function set_updated_at();
create trigger t_upd before update on public.timesheet_entries for each row execute function set_updated_at();
create trigger t_upd before update on public.documents for each row execute function set_updated_at();

-- Un congé approuvé décrémente le solde
create or replace function public.apply_leave_balance() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  if new.status = 'approuve' and old.status <> 'approuve' and new.leave_type_code = 'CA' then
    update leave_balances
      set taken_days = taken_days + new.working_days
      where employee_id = new.employee_id and year = extract(year from new.start_date)::int;
  end if;
  return new;
end $$;
create trigger t_leave_balance after update on public.leave_requests
  for each row execute function apply_leave_balance();

-- ============================================================
-- RLS
-- ============================================================
alter table public.leave_requests enable row level security;
alter table public.leave_balances enable row level security;
alter table public.timesheets enable row level security;
alter table public.timesheet_entries enable row level security;
alter table public.documents enable row level security;

-- leave_requests : admin/rh/dg société ; manager équipe ; employé les siennes
create policy leaves_select on public.leave_requests for select using (
  is_super_admin()
  or (company_id = current_company_id() and (
    has_role('admin','rh','dg')
    or (has_role('manager') and is_in_my_team(employee_id))
    or employee_id = current_employee_id()
  ))
);
create policy leaves_insert on public.leave_requests for insert with check (
  company_id = current_company_id() and (
    has_role('admin','rh') or employee_id = current_employee_id()
  )
);
-- validation : manager (équipe) ou rh/admin
create policy leaves_update on public.leave_requests for update using (
  company_id = current_company_id() and (
    has_role('admin','rh')
    or (has_role('manager') and is_in_my_team(employee_id))
    or (employee_id = current_employee_id() and status = 'attente_manager') -- annulation par le salarié
  )
);

-- leave_balances : admin/rh/dg ; manager équipe ; employé le sien ; écriture admin/rh
create policy balances_select on public.leave_balances for select using (
  is_super_admin()
  or (company_id = current_company_id() and (
    has_role('admin','rh','dg')
    or (has_role('manager') and is_in_my_team(employee_id))
    or employee_id = current_employee_id()
  ))
);
create policy balances_insert on public.leave_balances for insert
  with check ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin());
create policy balances_update on public.leave_balances for update
  using ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin());

-- timesheets + entries : admin/rh/dg ; manager équipe ; employé les siennes
create policy ts_select on public.timesheets for select using (
  is_super_admin()
  or (company_id = current_company_id() and (
    has_role('admin','rh','dg')
    or (has_role('manager') and is_in_my_team(employee_id))
    or employee_id = current_employee_id()
  ))
);
create policy ts_insert on public.timesheets for insert with check (
  company_id = current_company_id() and (has_role('admin','rh','manager') or employee_id = current_employee_id())
);
create policy ts_update on public.timesheets for update using (
  company_id = current_company_id() and (
    has_role('admin','rh')
    or (has_role('manager') and is_in_my_team(employee_id))
  )
);

create policy tse_select on public.timesheet_entries for select using (
  is_super_admin() or (company_id = current_company_id())
);
create policy tse_insert on public.timesheet_entries for insert
  with check (company_id = current_company_id() and has_role('admin','rh','manager','employe'));
create policy tse_update on public.timesheet_entries for update
  using (company_id = current_company_id() and has_role('admin','rh','manager'));

-- documents : admin/rh/dg tout ; comptable catégorie paie ; employé ses documents
create policy docs_select on public.documents for select using (
  is_super_admin()
  or (company_id = current_company_id() and (
    has_role('admin','rh','dg')
    or (has_role('comptable') and category = 'paie')
    or employee_id = current_employee_id()
  ))
);
create policy docs_insert on public.documents for insert
  with check ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin());
create policy docs_delete on public.documents for delete
  using (company_id = current_company_id() and has_role('admin'));
