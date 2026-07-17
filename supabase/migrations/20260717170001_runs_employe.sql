-- ============================================================
-- 0008 — Un salarié peut lire l'EN-TÊTE des périodes de paie où il possède
-- un bulletin (période, statut) : nécessaire au portail « Mes bulletins »
-- et au téléchargement PDF. Il ne voit toujours QUE ses propres bulletins.
-- ============================================================
drop policy if exists runs_select on public.payroll_runs;
create policy runs_select on public.payroll_runs for select using (
  is_super_admin()
  or (company_id = current_company_id() and has_role('admin','rh','dg','comptable'))
  or exists (
    select 1 from public.payslips p
    where p.payroll_run_id = payroll_runs.id
      and p.employee_id = current_employee_id()
  )
);
