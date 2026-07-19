import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";

/**
 * Import Excel/CSV des salariés (étape L).
 *   GET  → modèle .xlsx pré-formaté (mêmes colonnes que l'ancien SIRH)
 *   POST → multipart { fichier } ; ?commit=1 pour importer, sinon
 *          PRÉVISUALISATION avec rapport d'erreurs ligne par ligne.
 */

const COLONNES = [
  "Civilité", "Nom", "Prénom", "Date naissance (JJ/MM/AAAA)", "Lieu naissance",
  "Nationalité", "Téléphone", "Email", "Adresse", "N° CNSS",
  "Type contrat (CDI/CDD)", "Date embauche (JJ/MM/AAAA)", "Date fin CDD (JJ/MM/AAAA)",
  "Catégorie", "Salaire de base (GNF)", "Prime ancienneté", "Prime repas",
  "Indemnité logement", "Indemnité transport", "Cherté de vie", "Banque", "N° compte",
] as const;

export async function GET() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Salariés");
  ws.addRow([...COLONNES]);
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7F2EE" } };
  ws.columns.forEach((c, i) => { c.width = Math.max(14, COLONNES[i].length + 2); });
  // Ligne d'exemple
  ws.addRow(["M.", "DIALLO", "Mamadou", "15/03/1990", "Conakry", "Guinéenne",
    "620 00 00 00", "m.diallo@exemple.gn", "Ratoma, Conakry", "11905 9999",
    "CDI", "01/08/2026", "", "Employé", 2000000, 0, 100000, 150000, 100000, 80000, "BIG", "123456789"]);
  ws.getRow(2).font = { italic: true, color: { argb: "FF5C6B66" } };
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modele_import_salaries.xlsx"',
    },
  });
}

interface LigneImport {
  ligne: number;
  nom: string;
  erreurs: string[];
  donnees: Record<string, string | number | null> | null;
}

function versDate(v: ExcelJS.CellValue): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v ?? "").trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}
function versEntier(v: ExcelJS.CellValue): number | null {
  if (typeof v === "number") return Number.isInteger(v) && v >= 0 ? v : null;
  const s = String(v ?? "").replace(/[\s ]/g, "");
  if (s === "") return 0;
  return /^\d+$/.test(s) ? Number(s) : null;
}

export async function POST(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const { data: profil } = await sb.from("profiles").select("company_id, role").eq("id", user.id).single();
  if (!["admin", "rh"].includes(profil?.role ?? "")) {
    return NextResponse.json({ error: "Réservé aux rôles RH/Admin." }, { status: 403 });
  }
  const commit = new URL(req.url).searchParams.get("commit") === "1";

  const form = await req.formData().catch(() => null);
  const fichier = form?.get("fichier");
  if (!(fichier instanceof File)) return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(await fichier.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "Fichier illisible — utilisez le modèle .xlsx fourni." }, { status: 400 });
  }
  const ws = wb.worksheets[0];
  if (!ws || ws.rowCount < 2) return NextResponse.json({ error: "Aucune ligne de données." }, { status: 400 });

  const rapport: LigneImport[] = [];
  const emailsVus = new Set<string>();
  ws.eachRow((row, n) => {
    if (n === 1) return; // en-têtes
    const v = (i: number) => row.getCell(i).value;
    const texte = (i: number) => String(v(i) ?? "").trim();
    if (!texte(2) && !texte(3)) return; // ligne vide (ou ligne d'exemple effacée)

    const erreurs: string[] = [];
    const nom = texte(2).toUpperCase();
    const prenom = texte(3);
    if (!nom) erreurs.push("Nom manquant");
    if (!prenom) erreurs.push("Prénom manquant");

    const naissance = versDate(v(4));
    if (!naissance) erreurs.push("Date de naissance invalide (JJ/MM/AAAA)");
    const embauche = versDate(v(12));
    if (!embauche) erreurs.push("Date d'embauche invalide (JJ/MM/AAAA)");
    if (naissance && embauche) {
      const age = (new Date(embauche).getTime() - new Date(naissance).getTime()) / (365.25 * 86400e3);
      if (age < 16) erreurs.push(`Âge à l'embauche ${age.toFixed(1)} ans < 16 ans (Code du travail)`);
    }

    const contrat = texte(11).toUpperCase() || "CDI";
    if (!["CDI", "CDD"].includes(contrat)) erreurs.push(`Type de contrat inconnu : ${contrat}`);
    const finCdd = versDate(v(13));
    if (contrat === "CDD") {
      if (!finCdd) erreurs.push("Date de fin obligatoire pour un CDD");
      else if (embauche) {
        const mois = (new Date(finCdd).getTime() - new Date(embauche).getTime()) / (30.44 * 86400e3);
        if (mois > 24) erreurs.push(`CDD de ${Math.round(mois)} mois > 24 mois maximum`);
      }
    }

    const salaire = versEntier(v(15));
    if (salaire === null) erreurs.push("Salaire de base : entier GNF requis (pas de décimales)");
    else if (salaire <= 0) erreurs.push("Salaire de base obligatoire (> 0)");
    const primes = [16, 17, 18, 19, 20].map((i) => versEntier(v(i)));
    if (primes.some((p) => p === null)) erreurs.push("Primes/indemnités : entiers GNF requis");

    const email = texte(8).toLowerCase();
    if (email && emailsVus.has(email)) erreurs.push(`Email en doublon dans le fichier : ${email}`);
    if (email) emailsVus.add(email);

    rapport.push({
      ligne: n,
      nom: `${nom} ${prenom}`.trim() || `ligne ${n}`,
      erreurs,
      donnees: erreurs.length > 0 ? null : {
        civility: texte(1) || "M.", last_name: nom, first_name: prenom,
        birth_date: naissance, birth_place: texte(5) || null,
        nationality: texte(6) || "Guinéenne", phone: texte(7) || null,
        email: email || null, address: texte(9) || null, cnss_number: texte(10) || null,
        contract_type: contrat, hire_date: embauche, contract_end_date: finCdd,
        category: texte(14) || "Employé",
        base_salary: salaire, seniority_bonus: primes[0], meal_allowance: primes[1],
        housing_allowance: primes[2], transport_allowance: primes[3],
        cost_of_living_allowance: primes[4],
        bank_name: texte(21) || null, bank_account: texte(22) || null,
      },
    });
  });

  const valides = rapport.filter((r) => r.erreurs.length === 0);
  const resume = {
    total: rapport.length,
    valides: valides.length,
    enErreur: rapport.length - valides.length,
    rapport: rapport.map(({ donnees: _d, ...r }) => { void _d; return r; }),
  };

  if (!commit) return NextResponse.json({ ...resume, mode: "previsualisation" });

  // ----- Import réel des lignes valides (matricule serveur, RLS active) -----
  const importes: string[] = [];
  for (const r of valides) {
    const d = r.donnees!;
    const { data: matricule, error: eMat } = await sb.rpc("next_matricule", { p_company: profil!.company_id });
    if (eMat) return NextResponse.json({ error: `Matricule : ${eMat.message}` }, { status: 500 });
    const { data: emp, error: eEmp } = await sb.from("employees").insert({
      company_id: profil!.company_id, matricule,
      civility: d.civility, last_name: d.last_name, first_name: d.first_name,
      birth_date: d.birth_date, birth_place: d.birth_place, nationality: d.nationality,
      phone: d.phone, email: d.email, address: d.address, cnss_number: d.cnss_number,
      contract_type: d.contract_type, hire_date: d.hire_date,
      contract_end_date: d.contract_end_date, category: d.category,
      bank_name: d.bank_name, bank_account: d.bank_account, status: "actif",
    }).select("id").single();
    if (eEmp) {
      return NextResponse.json({
        error: `Ligne ${r.ligne} (${r.nom}) : ${eEmp.message} — ${importes.length} salarié(s) déjà importé(s) avant l'erreur.`,
        importes,
      }, { status: 400 });
    }
    await sb.from("employee_compensation").insert({
      employee_id: emp.id, company_id: profil!.company_id,
      base_salary: d.base_salary, seniority_bonus: d.seniority_bonus,
      meal_allowance: d.meal_allowance, housing_allowance: d.housing_allowance,
      transport_allowance: d.transport_allowance, cost_of_living_allowance: d.cost_of_living_allowance,
    });
    importes.push(`${matricule} ${r.nom}`);
  }
  return NextResponse.json({ ...resume, mode: "import", importes });
}
