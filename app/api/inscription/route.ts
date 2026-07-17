import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Inscription self-service : crée l'entreprise (essai 30 jours), le compte
 * admin et les référentiels guinéens par défaut (étape I : seed automatique).
 * service_role UNIQUEMENT ici, côté serveur (CLAUDE.md §5.3).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password || !body?.raisonSociale || !body?.prenom || !body?.nom) {
    return NextResponse.json({ error: "Champs obligatoires manquants." }, { status: 400 });
  }
  if (String(body.password).length < 8) {
    return NextResponse.json({ error: "Mot de passe : 8 caractères minimum." }, { status: 400 });
  }

  const sb = createAdminClient();

  const { data: created, error: userErr } = await sb.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
  });
  if (userErr) {
    return NextResponse.json(
      { error: userErr.message.includes("already") ? "Un compte existe déjà avec cet email." : userErr.message },
      { status: 400 }
    );
  }

  const trialEnd = new Date(Date.now() + 30 * 86400e3).toISOString().slice(0, 10);
  const { data: company, error: compErr } = await sb.from("companies").insert({
    name: body.raisonSociale,
    legal_form: body.formeJuridique ?? "SARL",
    nif: body.nif ?? null,
    cnss_employer_number: body.cnssEmployeur ?? null,
    address: body.adresse ?? null,
    status: "trial",
  }).select("id").single();
  if (compErr) {
    await sb.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: compErr.message }, { status: 400 });
  }
  const G = company.id;

  const { error: profErr } = await sb.from("profiles").insert({
    id: created.user.id, company_id: G, role: "admin",
    full_name: `${body.prenom} ${body.nom}`, email: body.email,
  });
  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 400 });

  await sb.from("subscriptions").insert({
    company_id: G, plan_id: null, status: "trial", trial_ends_at: trialEnd,
  });

  // Référentiels guinéens par défaut (étape I)
  await sb.from("contract_types").insert([
    { company_id: G, code: "CDI", name: "Contrat à durée indéterminée", requires_end_date: false },
    { company_id: G, code: "CDD", name: "Contrat à durée déterminée", max_months: 24, requires_end_date: true },
  ]);
  await sb.from("leave_types").insert([
    { company_id: G, code: "CA", name: "Congé annuel", paid: true, deducts_balance: true },
    { company_id: G, code: "CM", name: "Congé maladie", paid: true, deducts_balance: false },
    { company_id: G, code: "CMAT", name: "Congé maternité", paid: true, entitlement_days: 98, deducts_balance: false },
    { company_id: G, code: "PERM", name: "Permission exceptionnelle", paid: true, deducts_balance: false },
    { company_id: G, code: "ANJ", name: "Absence non justifiée", paid: false, deducts_balance: false },
  ]);
  await sb.from("premium_types").insert([
    { company_id: G, code: "ANC", name: "Prime d'ancienneté", taxable_rts: true, subject_cnss: true },
    { company_id: G, code: "REPAS", name: "Prime de repas", taxable_rts: false, subject_cnss: true },
    { company_id: G, code: "LOG", name: "Indemnité de logement", taxable_rts: false, subject_cnss: false },
    { company_id: G, code: "TRANS", name: "Indemnité de transport", taxable_rts: false, subject_cnss: false },
    { company_id: G, code: "CHERTE", name: "Indemnité cherté de vie", taxable_rts: false, subject_cnss: false },
  ]);

  return NextResponse.json({ ok: true, companyId: G, trialEnd });
}
