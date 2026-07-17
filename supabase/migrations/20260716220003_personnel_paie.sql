-- ============================================================
-- 0003 — PERSONNEL (employés, rémunération, mouvements, prêts) + PAIE
-- ============================================================

-- ----- Employés (identité, contrat — SANS les salaires) -----
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  matricule text not null,
  civility text default 'M.',
  last_name text not null,
  first_name text not null,
  birth_date date not null,
  birth_place text,
  nationality text default 'Guinéenne',
  marital_status text,
  children_count int default 0,
  cnss_number text,
  id_doc_type text default 'CNI',
  id_doc_number text,
  id_doc_expiry date,
  address text,
  phone text,
  email text,
  emergency_contact_name text,
  emergency_contact_phone text,
  department_id uuid references public.departments(id),
  position_id uuid references public.positions(id),
  manager_id uuid references public.employees(id),
  contract_type text not null default 'CDI',
  hire_date date not null,
  contract_end_date date,     -- obligatoire si CDD (vérifié par contrainte)
  trial_end_date date,
  category text default 'Employé',
  qualification text,
  monthly_hours numeric not null default 173.33,
  bank_name text,
  bank_account text,
  payment_mode text default 'Virement',
  status text not null default 'actif' check (status in ('actif','essai','sorti','suspendu')),
  exit_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, matricule),
  constraint age_minimum check (birth_date <= (hire_date - interval '16 years')),
  constraint cdd_date_fin check (contract_type <> 'CDD' or contract_end_date is not null),
  constraint cdd_24_mois check (contract_type <> 'CDD' or contract_end_date <= hire_date + interval '24 months')
);
create index on public.employees (company_id, status);
create index on public.employees (manager_id);

alter table public.profiles
  add constraint profiles_employee_fk foreign key (employee_id) references public.employees(id);

-- Helper : le salarié appartient-il à l'équipe du manager connecté ?
create or replace function public.is_in_my_team(emp_id uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from employees where id = emp_id and manager_id = current_employee_id()) $$;

-- Génération serveur du matricule EMP-XXX (unique par entreprise, non modifiable)
create or replace function public.next_matricule(p_company uuid) returns text
language plpgsql security definer set search_path = public as
$$
declare seq int;
begin
  update companies set next_employee_seq = next_employee_seq + 1
  where id = p_company returning next_employee_seq - 1 into seq;
  return 'EMP-' || lpad(seq::text, 3, '0');
end $$;

-- ----- Rémunération (table séparée : le manager n'y accède JAMAIS) -----
create table public.employee_compensation (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  company_id uuid not null references public.companies(id),
  base_salary bigint not null check (base_salary >= 0),
  seniority_bonus bigint not null default 0,
  meal_allowance bigint not null default 0,
  housing_allowance bigint not null default 0,
  transport_allowance bigint not null default 0,
  cost_of_living_allowance bigint not null default 0,
  other_bonuses bigint not null default 0,
  -- ⚠ Surcharge éventuelle de l'assiette VF (CLAUDE.md §6.5 — arbitrage humain requis)
  vf_abatement_type text check (vf_abatement_type in ('fixed','percent')),
  vf_abatement_value numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.employee_compensation (company_id);

-- ----- Mouvements de carrière (seule voie de modification du salaire) -----
create table public.employee_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  employee_id uuid not null references public.employees(id),
  movement_type text not null check (movement_type in
    ('augmentation','promotion','mutation','suspension','depart','embauche','pret','autre')),
  field_changed text,
  old_value text,
  new_value text,
  reason text not null,
  effective_date date not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.employee_movements (company_id, employee_id);

-- Trigger : une augmentation répercute le nouveau salaire (jamais d'UPDATE direct)
create or replace function public.apply_salary_movement() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  if new.movement_type = 'augmentation' and new.field_changed = 'base_salary' then
    update employee_compensation
      set base_salary = new.new_value::bigint
      where employee_id = new.employee_id;
  elsif new.movement_type = 'depart' then
    update employees set status = 'sorti', exit_date = new.effective_date
      where id = new.employee_id;
  end if;
  return new;
end $$;
create trigger t_apply_movement after insert on public.employee_movements
  for each row execute function apply_salary_movement();

-- ----- Prêts & avances avec échéancier -----
create table public.loans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  employee_id uuid not null references public.employees(id),
  loan_type text not null default 'pret' check (loan_type in ('pret','avance')),
  total_amount bigint not null,
  monthly_amount bigint not null,      -- ex. FAYE : 2 016 982
  installments_total int not null,
  installments_paid int not null default 0,
  start_date date not null,
  status text not null default 'actif' check (status in ('actif','solde','suspendu')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.loans (company_id, employee_id);

-- ----- Cycles de paie -----
create table public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  status text not null default 'brouillon' check (status in ('brouillon','valide','cloture')),
  generated_at timestamptz,
  generated_by uuid,
  closed_at timestamptz,
  closed_by uuid,
  bareme_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, period_year, period_month)
);
create index on public.payroll_runs (company_id, period_year, period_month);

-- ----- Bulletins (montants FIGÉS à la clôture) -----
create table public.payslips (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  employee_id uuid not null references public.employees(id),
  employee_name text not null,      -- instantané (archives + accès comptable sans jointure)
  matricule text not null,
  position_title text,
  -- montants GNF en entiers (jamais de float — CLAUDE.md §4)
  gross bigint not null,
  base_cnss bigint not null,
  cnss_employee bigint not null,
  cnss_employer bigint not null,
  taxable_net bigint not null,
  rts bigint not null,
  vf_base bigint not null,
  vf bigint not null,
  cfpa bigint not null,
  loans_deduction bigint not null default 0,
  other_deductions bigint not null default 0,
  net_pay bigint not null,
  earnings jsonb not null default '[]',    -- détail des gains (rendu bulletin)
  deductions jsonb not null default '[]',  -- détail des retenues manuelles (survivent au recalcul)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payroll_run_id, employee_id),
  constraint net_positif check (net_pay >= 0)  -- une retenue ne peut pas rendre le net négatif (§6.7)
);
create index on public.payslips (company_id, payroll_run_id);
create index on public.payslips (employee_id);

-- ----- VERROU : aucun UPDATE/DELETE sur un bulletin d'une période clôturée (§6.6) -----
create or replace function public.reject_locked_payslip() returns trigger
language plpgsql security definer set search_path = public as
$$
declare v_status text;
begin
  select status into v_status from payroll_runs where id = coalesce(new.payroll_run_id, old.payroll_run_id);
  if v_status = 'cloture' then
    raise exception 'Bulletin clôturé : modification interdite. Passez par un rappel/reprise sur le mois suivant.';
  end if;
  return coalesce(new, old);
end $$;
create trigger t_lock_payslip before update or delete on public.payslips
  for each row execute function reject_locked_payslip();

-- Clôture d'une période (fige les montants)
create or replace function public.close_payroll_run(p_run uuid) returns void
language plpgsql security definer set search_path = public as
$$
begin
  if not (has_role('admin','rh') or is_super_admin()) then
    raise exception 'Seul un profil RH/Admin peut clôturer la paie.';
  end if;
  update payroll_runs set status = 'cloture', closed_at = now(), closed_by = auth.uid()
  where id = p_run and company_id = current_company_id();
end $$;

-- ----- Triggers upd/audit -----
create trigger t_upd before update on public.employees for each row execute function set_updated_at();
create trigger t_upd before update on public.employee_compensation for each row execute function set_updated_at();
create trigger t_upd before update on public.employee_movements for each row execute function set_updated_at();
create trigger t_upd before update on public.loans for each row execute function set_updated_at();
create trigger t_upd before update on public.payroll_runs for each row execute function set_updated_at();
create trigger t_upd before update on public.payslips for each row execute function set_updated_at();

create trigger t_audit after insert or update or delete on public.employees
  for each row execute function write_audit();
create trigger t_audit after insert or update or delete on public.employee_compensation
  for each row execute function write_audit();
create trigger t_audit after insert or update or delete on public.payslips
  for each row execute function write_audit();

-- ============================================================
-- RLS
-- ============================================================
alter table public.employees enable row level security;
alter table public.employee_compensation enable row level security;
alter table public.employee_movements enable row level security;
alter table public.loans enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payslips enable row level security;

-- employees : admin/rh/dg → société ; manager → son équipe + lui-même ; employé → sa fiche
create policy employees_select on public.employees for select using (
  is_super_admin()
  or (company_id = current_company_id() and (
    has_role('admin','rh','dg')
    or (has_role('manager') and (manager_id = current_employee_id() or id = current_employee_id()))
    or (has_role('employe') and id = current_employee_id())
  ))
);
create policy employees_insert on public.employees for insert
  with check ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin());
create policy employees_update on public.employees for update
  using ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin());
-- pas de delete : un salarié « sort », il n'est jamais supprimé

-- employee_compensation : admin/rh/dg + l'employé lui-même. JAMAIS manager ni comptable.
create policy compensation_select on public.employee_compensation for select using (
  is_super_admin()
  or (company_id = current_company_id() and (
    has_role('admin','rh','dg') or employee_id = current_employee_id()
  ))
);
create policy compensation_insert on public.employee_compensation for insert
  with check ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin());
-- PAS de policy update : le salaire change uniquement via employee_movements (trigger security definer)

-- employee_movements : lecture rh/admin/dg + manager (équipe) + employé (les siens) ; écriture admin/rh
create policy movements_select on public.employee_movements for select using (
  is_super_admin()
  or (company_id = current_company_id() and (
    has_role('admin','rh','dg')
    or (has_role('manager') and is_in_my_team(employee_id))
    or employee_id = current_employee_id()
  ))
);
create policy movements_insert on public.employee_movements for insert
  with check ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin());

-- loans : admin/rh/dg/comptable (lecture) + employé (les siens) ; écriture admin/rh
create policy loans_select on public.loans for select using (
  is_super_admin()
  or (company_id = current_company_id() and (
    has_role('admin','rh','dg','comptable') or employee_id = current_employee_id()
  ))
);
create policy loans_insert on public.loans for insert
  with check ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin());
create policy loans_update on public.loans for update
  using ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin());

-- payroll_runs : lecture admin/rh/dg/comptable ; écriture admin/rh
create policy runs_select on public.payroll_runs for select using (
  is_super_admin()
  or (company_id = current_company_id() and has_role('admin','rh','dg','comptable'))
);
create policy runs_insert on public.payroll_runs for insert
  with check ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin());
create policy runs_update on public.payroll_runs for update
  using ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin());
create policy runs_delete on public.payroll_runs for delete
  using (company_id = current_company_id() and has_role('admin','rh') and status = 'brouillon');

-- payslips : admin/rh (tout) ; dg/comptable lecture ; employé → SES bulletins
create policy payslips_select on public.payslips for select using (
  is_super_admin()
  or (company_id = current_company_id() and (
    has_role('admin','rh','dg','comptable') or employee_id = current_employee_id()
  ))
);
create policy payslips_insert on public.payslips for insert
  with check ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin());
create policy payslips_update on public.payslips for update
  using (company_id = current_company_id() and has_role('admin','rh'));
create policy payslips_delete on public.payslips for delete
  using (company_id = current_company_id() and has_role('admin','rh'));
