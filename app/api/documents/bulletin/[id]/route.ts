import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { genererBulletinPDF } from "@/lib/pdf/bulletin";

const MOIS = ["", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

/**
 * Téléchargement du bulletin PDF (format GARAYA).
 * La session utilisateur fait autorité : la RLS ne renvoie le bulletin que
 * si le rôle y donne droit (employé → les siens uniquement).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sb = await createClient();

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

  const { data: slip, error } = await sb
    .from("payslips")
    .select("*, payroll_runs(period_year, period_month), companies(name, address, nif, convention), employees(cnss_number, hire_date, positions(title))")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!slip) return NextResponse.json({ error: "Bulletin introuvable ou accès refusé." }, { status: 404 });

  const run = slip.payroll_runs as unknown as { period_year: number; period_month: number };
  const comp = slip.companies as unknown as { name: string; address: string | null; nif: string | null; convention: string | null };
  const emp = slip.employees as unknown as { cnss_number: string | null; hire_date: string; positions: { title: string } | null } | null;

  const anciennete = emp
    ? `${Math.floor((Date.now() - new Date(emp.hire_date).getTime()) / (365.25 * 86400e3))} ans`
    : "—";

  const gains = (slip.earnings as { libelle: string; montant: number }[]) ?? [];
  const retenues: { libelle: string; montant: number }[] = [];
  if (slip.loans_deduction > 0) retenues.push({ libelle: "Prêt / avance (mensualité)", montant: slip.loans_deduction });
  if (slip.other_deductions > 0) retenues.push({ libelle: "Autres retenues", montant: slip.other_deductions });

  const pdf = await genererBulletinPDF({
    entreprise: comp,
    salarie: {
      nom: slip.employee_name,
      matricule: slip.matricule,
      poste: slip.position_title ?? emp?.positions?.title ?? null,
      cnss: emp?.cnss_number ?? null,
      anciennete,
    },
    periode: `${MOIS[run.period_month]} ${run.period_year}`,
    gains: gains.length > 0 ? gains : [{ libelle: "Salaire brut", montant: slip.gross }],
    cotisations: {
      baseCnss: slip.base_cnss, cnssSal: slip.cnss_employee, cnssPat: slip.cnss_employer,
      baseRts: slip.taxable_net, rts: slip.rts, baseVf: slip.vf_base, vf: slip.vf,
      brut: slip.gross, cfpa: slip.cfpa,
    },
    retenues,
    net: slip.net_pay,
  });

  const nomFichier = `bulletin_${slip.matricule}_${run.period_year}-${String(run.period_month).padStart(2, "0")}.pdf`;
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
    },
  });
}
