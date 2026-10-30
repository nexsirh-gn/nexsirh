-- ============================================================
-- 0012 — DURCISSEMENT RLS (audit de sécurité du 30/10/2026)
--
-- Six classes de failles corrigées, sans toucher aux migrations déjà
-- appliquées (§5.6 : on ne corrige que par une nouvelle migration) :
--
--  1. UPDATE sans WITH CHECK : une policy `for update using (...)` ne
--     contrôle que la ligne AVANT modification. Sans WITH CHECK, un admin
--     pouvait réécrire `company_id` et DÉPLACER une ligne chez un autre
--     tenant (évasion d'isolation). Toutes les policies UPDATE sont
--     reconstruites avec un WITH CHECK symétrique.
--  2. Élévation de privilège sur `profiles` : la policy `id = auth.uid()`
--     autorisait n'importe quel salarié à passer son propre `role` à
--     `admin` (voire `super_admin`, la contrainte tenant étant satisfiable
--     dans le même UPDATE). Verrouillé par policy + trigger.
--  3. Workflow de congés contournable : l'INSERT/UPDATE ne contraignait
--     pas `status` — un salarié pouvait créer ou passer sa demande
--     directement en `approuve`.
--  4. `timesheet_entries` : lecture ouverte à TOUT membre du tenant
--     (pointages de tous les collègues) et écriture sur la feuille de
--     n'importe qui. Aligné sur les droits de `timesheets`.
--  5. Écriture inter-tenant par `employee_id` : les policies ne
--     vérifiaient que le `company_id` de la ligne écrite, jamais que le
--     salarié visé appartient bien à cette entreprise.
--  6. Champs pilotés par la plateforme (`companies.status`) modifiables
--     par l'admin du tenant → une entreprise suspendue se réactivait.
-- ============================================================

-- ============================================================
-- HELPERS
-- ============================================================

-- Le salarié visé appartient-il bien à l'entreprise indiquée ?
create or replace function public.is_employee_of(p_employee uuid, p_company uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (
     select 1 from employees e where e.id = p_employee and e.company_id = p_company
   ) $$;

-- Droits de LECTURE sur une feuille de temps (admin/rh/dg, manager de
-- l'équipe, ou le salarié concerné) — sert aux pointages journaliers.
create or replace function public.can_read_timesheet(p_timesheet uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select public.is_super_admin() or exists (
     select 1 from timesheets t
     where t.id = p_timesheet
       and t.company_id = public.current_company_id()
       and (
         public.has_role('admin','rh','dg')
         or (public.has_role('manager') and public.is_in_my_team(t.employee_id))
         or t.employee_id = public.current_employee_id()
       )
   ) $$;

-- Droits d'ÉCRITURE sur une feuille de temps : admin/rh, manager de
-- l'équipe, ou le salarié lui-même tant que la feuille n'est pas validée.
create or replace function public.can_write_timesheet(p_timesheet uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (
     select 1 from timesheets t
     where t.id = p_timesheet
       and t.company_id = public.current_company_id()
       and (
         public.has_role('admin','rh')
         or (public.has_role('manager') and public.is_in_my_team(t.employee_id))
         or (t.employee_id = public.current_employee_id() and t.status = 'a_valider')
       )
   ) $$;

-- ============================================================
-- 1 + 2. FONDATION : companies, profiles
-- ============================================================

drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies for update
  using ((id = current_company_id() and has_role('admin','rh')) or is_super_admin())
  with check ((id = current_company_id() and has_role('admin','rh')) or is_super_admin());

-- profiles : un utilisateur modifie SA fiche (nom, téléphone) ; admin/rh
-- gèrent les comptes de l'entreprise. Le WITH CHECK empêche le changement
-- de tenant ; le trigger ci-dessous verrouille `role` et `employee_id`.
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or (company_id = current_company_id() and has_role('admin','rh')) or is_super_admin())
  with check (
    is_super_admin()
    or (company_id = current_company_id() and (id = auth.uid() or has_role('admin','rh')))
  );

create or replace function public.guard_profile_privileges() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  -- auth.uid() null = appel service_role côté serveur (routes d'inscription
  -- et d'invitation) : la RLS ne s'applique pas, le contrôle est applicatif.
  if auth.uid() is null or public.is_super_admin() then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'L''identifiant d''un profil n''est pas modifiable.';
  end if;
  if new.company_id is distinct from old.company_id then
    raise exception 'Le rattachement à l''entreprise n''est pas modifiable.';
  end if;

  if new.role is distinct from old.role then
    if auth.uid() = old.id then
      raise exception 'Vous ne pouvez pas modifier votre propre rôle.';
    end if;
    if not public.has_role('admin') then
      raise exception 'Seul un administrateur peut changer le rôle d''un utilisateur.';
    end if;
    if new.role = 'super_admin' then
      raise exception 'Le rôle super_admin ne s''attribue pas depuis une entreprise cliente.';
    end if;
  end if;

  if new.employee_id is distinct from old.employee_id
     and not public.has_role('admin','rh') then
    raise exception 'Le rattachement au dossier salarié est réservé aux rôles RH/Admin.';
  end if;

  return new;
end $$;

drop trigger if exists t_guard_profile on public.profiles;
create trigger t_guard_profile before update on public.profiles
  for each row execute function guard_profile_privileges();

-- ============================================================
-- 6. companies : champs pilotés par la plateforme
-- ============================================================
create or replace function public.guard_company_platform_fields() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  if auth.uid() is null or public.is_super_admin() then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.suspension_reason is distinct from old.suspension_reason then
    raise exception 'Le statut de l''abonnement est géré par la plateforme Nex''SIRH.';
  end if;
  return new;
end $$;

drop trigger if exists t_guard_company on public.companies;
create trigger t_guard_company before update on public.companies
  for each row execute function guard_company_platform_fields();

-- ============================================================
-- 1. RÉFÉRENTIELS TENANT + BARÈMES GLOBAUX
-- ============================================================
do $outer$
declare t text;
begin
  foreach t in array array['departments','positions','contract_types','leave_types','premium_types']
  loop
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('create policy %I_update on public.%I for update'
      || ' using ((company_id = current_company_id() and has_role(''admin'',''rh'')) or is_super_admin())'
      || ' with check ((company_id = current_company_id() and has_role(''admin'',''rh'')) or is_super_admin())', t, t);
  end loop;

  foreach t in array array['public_holidays','tax_brackets','contribution_rates']
  loop
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('create policy %I_update on public.%I for update'
      || ' using (is_super_admin()) with check (is_super_admin())', t, t);
  end loop;
end $outer$;

-- Jours fériés d'entreprise (migration 20260721141224)
drop policy if exists company_holidays_update on public.company_holidays;
create policy company_holidays_update on public.company_holidays for update
  using ((company_id = current_company_id() and has_role('admin','rh','dg')) or is_super_admin())
  with check ((company_id = current_company_id() and has_role('admin','rh','dg')) or is_super_admin());

-- ============================================================
-- 1 + 5. PERSONNEL & PAIE
-- ============================================================

-- `matricule` et `company_id` ne sont jamais modifiables (§4)
create or replace function public.guard_employee_identity() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  if new.matricule is distinct from old.matricule then
    raise exception 'Le matricule d''un salarié n''est pas modifiable.';
  end if;
  if new.company_id is distinct from old.company_id then
    raise exception 'Un salarié ne peut pas changer d''entreprise.';
  end if;
  return new;
end $$;

drop trigger if exists t_guard_employee on public.employees;
create trigger t_guard_employee before update on public.employees
  for each row execute function guard_employee_identity();

drop policy if exists employees_update on public.employees;
create policy employees_update on public.employees for update
  using ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin())
  with check ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin());

-- Le salarié visé doit appartenir à l'entreprise de la ligne écrite
create or replace function public.assert_employee_in_company() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  if not public.is_employee_of(new.employee_id, new.company_id) then
    raise exception 'Salarié hors de l''entreprise indiquée : opération refusée.';
  end if;
  return new;
end $$;

do $outer$
declare t text;
begin
  foreach t in array array['employee_compensation','employee_movements','loans',
                           'payslips','leave_requests','leave_balances','timesheets']
  loop
    execute format('drop trigger if exists t_assert_employee on public.%I', t);
    execute format('create trigger t_assert_employee before insert or update on public.%I'
      || ' for each row execute function assert_employee_in_company()', t);
  end loop;
end $outer$;

drop policy if exists loans_update on public.loans;
create policy loans_update on public.loans for update
  using ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin())
  with check ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin());

drop policy if exists runs_update on public.payroll_runs;
create policy runs_update on public.payroll_runs for update
  using ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin())
  with check ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin());

drop policy if exists payslips_update on public.payslips;
create policy payslips_update on public.payslips for update
  using (company_id = current_company_id() and has_role('admin','rh'))
  with check (company_id = current_company_id() and has_role('admin','rh'));

-- Le mouvement de carrière ne touche que la rémunération du MÊME tenant
create or replace function public.apply_salary_movement() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  if new.movement_type = 'augmentation' and new.field_changed = 'base_salary' then
    update employee_compensation
      set base_salary = new.new_value::bigint
      where employee_id = new.employee_id and company_id = new.company_id;
  elsif new.movement_type = 'depart' then
    update employees set status = 'sorti', exit_date = new.effective_date
      where id = new.employee_id and company_id = new.company_id;
  end if;
  return new;
end $$;

-- Génération de matricule : le paramètre n'est plus de confiance
create or replace function public.next_matricule(p_company uuid) returns text
language plpgsql security definer set search_path = public as
$$
declare seq int;
begin
  if auth.uid() is not null and not is_super_admin() then
    if not has_role('admin','rh') then
      raise exception 'Génération de matricule réservée aux rôles RH/Admin.';
    end if;
    if p_company is distinct from current_company_id() then
      raise exception 'Génération de matricule hors de votre entreprise : refusée.';
    end if;
  end if;
  update companies set next_employee_seq = next_employee_seq + 1
  where id = p_company returning next_employee_seq - 1 into seq;
  if seq is null then
    raise exception 'Entreprise introuvable.';
  end if;
  return 'EMP-' || lpad(seq::text, 3, '0');
end $$;

-- ============================================================
-- 3. CONGÉS : le workflow n'est plus contournable
-- ============================================================
drop policy if exists leaves_insert on public.leave_requests;
create policy leaves_insert on public.leave_requests for insert with check (
  company_id = current_company_id() and (
    has_role('admin','rh')
    -- un salarié crée SA demande, obligatoirement en début de workflow
    or (employee_id = current_employee_id() and status = 'attente_manager')
  )
);

drop policy if exists leaves_update on public.leave_requests;
create policy leaves_update on public.leave_requests for update
  using (
    company_id = current_company_id() and (
      has_role('admin','rh')
      or (has_role('manager') and is_in_my_team(employee_id))
      or (employee_id = current_employee_id() and status = 'attente_manager')
    )
  )
  with check (
    company_id = current_company_id() and (
      has_role('admin','rh')
      -- le manager transmet, refuse ou annule ; il n'approuve jamais seul
      or (has_role('manager') and is_in_my_team(employee_id)
          and status in ('attente_rh','refuse','annule'))
      -- le salarié ne peut QUE annuler sa demande
      or (employee_id = current_employee_id() and status = 'annule')
    )
  );

drop policy if exists balances_update on public.leave_balances;
create policy balances_update on public.leave_balances for update
  using ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin())
  with check ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin());

-- ============================================================
-- 4. TEMPS & PRÉSENCE
-- ============================================================
drop policy if exists ts_insert on public.timesheets;
create policy ts_insert on public.timesheets for insert with check (
  company_id = current_company_id() and (
    has_role('admin','rh')
    or (has_role('manager') and is_in_my_team(employee_id))
    or employee_id = current_employee_id()
  )
);

drop policy if exists ts_update on public.timesheets;
create policy ts_update on public.timesheets for update
  using (
    company_id = current_company_id() and (
      has_role('admin','rh') or (has_role('manager') and is_in_my_team(employee_id))
    )
  )
  with check (
    company_id = current_company_id() and (
      has_role('admin','rh') or (has_role('manager') and is_in_my_team(employee_id))
    )
  );

-- Les pointages suivent exactement les droits de leur feuille de temps
create or replace function public.assert_entry_timesheet_company() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  if not exists (
    select 1 from timesheets t
    where t.id = new.timesheet_id and t.company_id = new.company_id
  ) then
    raise exception 'Feuille de temps hors de l''entreprise indiquée : opération refusée.';
  end if;
  return new;
end $$;

drop trigger if exists t_assert_entry on public.timesheet_entries;
create trigger t_assert_entry before insert or update on public.timesheet_entries
  for each row execute function assert_entry_timesheet_company();

drop policy if exists tse_select on public.timesheet_entries;
create policy tse_select on public.timesheet_entries for select
  using (can_read_timesheet(timesheet_id));

drop policy if exists tse_insert on public.timesheet_entries;
create policy tse_insert on public.timesheet_entries for insert
  with check (company_id = current_company_id() and can_write_timesheet(timesheet_id));

drop policy if exists tse_update on public.timesheet_entries;
create policy tse_update on public.timesheet_entries for update
  using (can_write_timesheet(timesheet_id))
  with check (company_id = current_company_id() and can_write_timesheet(timesheet_id));

-- ============================================================
-- 1. ABONNEMENTS & CONSOLE : WITH CHECK sur les policies super_admin
-- ============================================================
drop policy if exists plans_write_u on public.plans;
create policy plans_write_u on public.plans for update using (is_super_admin()) with check (is_super_admin());

drop policy if exists subs_update on public.subscriptions;
create policy subs_update on public.subscriptions for update using (is_super_admin()) with check (is_super_admin());

drop policy if exists inv_update on public.invoices;
create policy inv_update on public.invoices for update using (is_super_admin()) with check (is_super_admin());

drop policy if exists promo_update on public.promo_codes;
create policy promo_update on public.promo_codes for update using (is_super_admin()) with check (is_super_admin());

drop policy if exists tickets_update on public.support_tickets;
create policy tickets_update on public.support_tickets for update using (is_super_admin()) with check (is_super_admin());

drop policy if exists ann_update on public.announcements;
create policy ann_update on public.announcements for update using (is_super_admin()) with check (is_super_admin());

drop policy if exists inc_all_u on public.platform_incidents;
create policy inc_all_u on public.platform_incidents for update using (is_super_admin()) with check (is_super_admin());

drop policy if exists team_u on public.admin_team_members;
create policy team_u on public.admin_team_members for update using (is_super_admin()) with check (is_super_admin());

-- Un client ne lit que les annonces réellement DIFFUSÉES (les annonces
-- programmées ne sont pas encore publiques).
drop policy if exists ann_select on public.announcements;
create policy ann_select on public.announcements for select
  using (is_super_admin() or (auth.uid() is not null and status = 'envoyee'));

-- Un message de ticket écrit par le client ne peut pas se faire passer
-- pour une réponse du support.
drop policy if exists tmsg_insert on public.support_ticket_messages;
create policy tmsg_insert on public.support_ticket_messages for insert with check (
  is_super_admin() or (
    author_type = 'client' and exists (
      select 1 from support_tickets t
      where t.id = ticket_id and t.company_id = current_company_id() and has_role('admin','rh')
    )
  )
);
