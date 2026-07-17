-- ============================================================
-- 0006 — Accès support (impersonation) : journalisation double
-- (côté entreprise cliente ET côté plateforme, CLAUDE + maquette console)
-- ============================================================
create or replace function public.log_support_access(p_company uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public as
$$
declare v_email text;
begin
  if not is_super_admin() then
    raise exception 'Accès support réservé à l''équipe plateforme.';
  end if;
  select email into v_email from profiles where id = auth.uid();
  -- Côté client : visible dans le journal de l'entreprise
  insert into audit_log (company_id, actor_id, actor_email, action, target_table, target_id, after_data)
  values (p_company, auth.uid(), v_email, 'acces_support', 'companies', p_company::text,
          jsonb_build_object('motif', p_reason, 'duree_max_min', 60, 'restrictions', 'lecture seule salaires'));
  -- Côté plateforme : company_id null = événement console
  insert into audit_log (company_id, actor_id, actor_email, action, target_table, target_id, after_data)
  values (null, auth.uid(), v_email, 'acces_support', 'companies', p_company::text,
          jsonb_build_object('motif', p_reason));
end $$;
