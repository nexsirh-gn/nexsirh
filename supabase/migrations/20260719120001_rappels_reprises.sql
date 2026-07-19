-- ============================================================
-- 0010 — Rappels / reprises et retenues manuelles (étape N)
-- Les saisies manuelles SURVIVENT au recalcul (CLAUDE.md §6.6) :
--   - manual_bonuses  : rappels (gains imposables et soumis CNSS,
--     réinjectés dans la chaîne de calcul comme « autres primes »)
--   - deductions      : retenues manuelles / reprises (déjà existante)
-- ============================================================
alter table public.payslips
  add column if not exists manual_bonuses jsonb not null default '[]';

comment on column public.payslips.manual_bonuses is
  'Rappels saisis manuellement [{libelle, montant}] — survivent au recalcul, réinjectés comme autres primes';
comment on column public.payslips.deductions is
  'Retenues manuelles / reprises [{libelle, montant}] — survivent au recalcul';
