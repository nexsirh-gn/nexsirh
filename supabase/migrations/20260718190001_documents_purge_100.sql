-- ============================================================
-- 0009 — Historique des documents générés : 100 lignes maximum
-- par entreprise. À chaque insertion, les plus anciens documents
-- au-delà de 100 sont supprimés automatiquement (trigger).
-- NB : seules les MÉTADONNÉES d'historique sont purgées — les
-- bulletins restent régénérables à la demande depuis la paie.
-- ============================================================
create or replace function public.trim_documents_history() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  delete from documents
  where company_id = new.company_id
    and id not in (
      select id from documents
      where company_id = new.company_id
      order by created_at desc
      limit 100
    );
  return new;
end $$;

create trigger t_trim_documents after insert on public.documents
  for each row execute function trim_documents_history();
