-- ============================================================
-- 0011 — Mise à jour des coordonnées par l'employé lui-même
-- ============================================================
-- employees_update (0003) restreint l'UPDATE direct à admin/rh. Un salarié
-- doit pouvoir corriger SES coordonnées (téléphone, adresse, contact
-- d'urgence) sans passer par le service RH. On expose une fonction
-- security definer avec une whitelist stricte de colonnes ; toute autre
-- colonne (salaire, contrat, matricule…) reste hors de portée.

create or replace function public.update_my_contact(
  p_phone text default null,
  p_address text default null,
  p_emergency_contact_name text default null,
  p_emergency_contact_phone text default null
) returns void
language plpgsql security definer set search_path = public as
$$
declare v_employee_id uuid;
begin
  v_employee_id := current_employee_id();
  if v_employee_id is null then
    raise exception 'Aucun dossier salarié rattaché à ce compte.';
  end if;

  update public.employees set
    phone = coalesce(p_phone, phone),
    address = coalesce(p_address, address),
    emergency_contact_name = coalesce(p_emergency_contact_name, emergency_contact_name),
    emergency_contact_phone = coalesce(p_emergency_contact_phone, emergency_contact_phone)
  where id = v_employee_id;
end $$;

revoke all on function public.update_my_contact from public;
grant execute on function public.update_my_contact to authenticated;
