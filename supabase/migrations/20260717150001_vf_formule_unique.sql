-- ============================================================
-- 0007 — Assiette VF : formule unique (arbitrage humain du 17/07/2026)
--   assiette_vf = brut − MIN(abatement_value ; employer_rate × brut)
-- Vérifiée 0 GNF d'écart sur les 8 bulletins GARAYA.
-- Le mécanisme de surcharge par salarié est SUPPRIMÉ (SYLLA/CAMARA suivent
-- la même formule : leur 6 % × brut tombe simplement sous le plafond).
-- ============================================================

-- contribution_rates : nouveau type d'abattement unique
alter table public.contribution_rates drop constraint if exists contribution_rates_abatement_type_check;
update public.contribution_rates
  set abatement_type = 'min_fixed_rate'
  where code = 'vf';
alter table public.contribution_rates
  add constraint contribution_rates_abatement_type_check
  check (abatement_type in ('min_fixed_rate'));

-- employee_compensation : suppression des colonnes de surcharge VF
alter table public.employee_compensation
  drop column if exists vf_abatement_type,
  drop column if exists vf_abatement_value;

-- ============================================================
-- Heures supplémentaires (décision du même jour) : la formule
-- taux horaire = salaire_base / heures mensuelles, majorations 25/50/100 %,
-- arrondi unique sur le total, est la seule source de vérité.
-- Correction des montants illustratifs du seed :
--   CONTE  : 2 000 000/173,33 × (8×1,25 + 4×1,5 + 3×2) = 253 851 GNF
--   SYLLA  : 1 500 000/173,33 × (8×1,25)               =  86 540 GNF
-- ============================================================
update public.timesheets t
  set overtime_amount = 253851
  from public.employees e
  where t.employee_id = e.id and e.matricule = 'EMP-010' and t.overtime_amount = 254810;

update public.timesheets t
  set overtime_amount = 86540
  from public.employees e
  where t.employee_id = e.id and e.matricule = 'EMP-006' and t.overtime_amount = 86540; -- déjà conforme à 0,13 près (arrondi)
