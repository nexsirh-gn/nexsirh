"use client";

import Link from "next/link";
import { useModal, useToast } from "@/components/providers";

export default function VueEnsemble() {
  const { om } = useModal();
  const toast = useToast();
  return (
    <div>
      <div className="kpis">
        <div className="kpi gold"><div className="l">MRR — Revenu mensuel récurrent</div><div className="v mrr">31 450 000 <span style={{ fontSize: 13, color: "var(--gris)" }}>GNF</span></div><div className="d"><b>+8,2 %</b> vs juin · ARR ≈ <span className="mono">377 M</span></div></div>
        <div className="kpi"><div className="l">Entreprises actives</div><div className="v">38</div><div className="d"><b>+3</b> ce mois · 1 314 salariés gérés</div></div>
        <div className="kpi"><div className="l">Essais en cours</div><div className="v">9</div><div className="d">taux de conversion 30 j : <b>52 %</b></div></div>
        <div className="kpi"><div className="l">Churn / Impayés</div><div className="v">1,8 % <span style={{ fontSize: 14 }}>· 2</span></div><div className="d"><Link className="link" href="/admin/abonnements">2 impayés à relancer →</Link></div></div>
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="hd"><h3>MRR — 7 derniers mois (GNF)</h3><span className="sp" /><button className="btn btn-o btn-sm" onClick={() => toast("Export CSV des revenus généré")}>⇩ CSV</button></div>
          <div className="bd">
            <div className="bars">
              {[["38%", "Jan"], ["45%", "Fév"], ["52%", "Mar"], ["58%", "Avr"], ["66%", "Mai"], ["74%", "Juin"]].map(([h, m]) => (
                <div key={m} className="bar"><i style={{ height: h }} /><small>{m}</small></div>
              ))}
              <div className="bar hl"><i style={{ height: "80%" }} /><small>Juil</small></div>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="hd"><h3>Santé de la plateforme</h3><span className="sp" /><Link className="link" href="/admin/monitoring">Monitoring →</Link></div>
          <div className="bd" style={{ paddingTop: 14 }}>
            <div className="stat-line"><span><span className="sev ok" />Application (Vercel)</span><b className="mono">99,98 % · 210 ms</b></div>
            <div className="stat-line"><span><span className="sev ok" />Base de données (Supabase)</span><b className="mono">99,99 % · 41 %</b></div>
            <div className="stat-line"><span><span className="sev ok" />Génération PDF</span><b className="mono">1 842 docs / 7 j</b></div>
            <div className="stat-line"><span><span className="sev warn" />Emails (Resend)</span><b className="mono">3 rebonds hier</b></div>
            <div className="alert vt" style={{ marginTop: 12 }}><span className="ic">✓</span><div>Aucun incident en cours. Dernier : 08/07 (lenteur PDF, résolu en 22 min).</div></div>
          </div>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 18 }}>
        <div className="panel">
          <div className="hd"><h3>Dernières inscriptions</h3><span className="sp" /><Link className="link" href="/admin/entreprises">Toutes →</Link></div>
          <table>
            <tbody>
              <tr><th>Entreprise</th><th>Plan</th><th className="num">Salariés</th><th>Inscrite le</th><th></th></tr>
              <tr><td><b>SOGUIPAH SARL</b><br /><small style={{ color: "var(--gris)" }}>Agro-industrie · Conakry</small></td><td><span className="bg bg-o">Essai — j.24/30</span></td><td className="gnf mono">31</td><td>18/06</td><td><Link className="btn btn-o btn-sm" href="/admin/entreprises/garaya-holding">Ouvrir</Link></td></tr>
              <tr><td><b>TRANSCO GUINÉE</b><br /><small style={{ color: "var(--gris)" }}>Transport · Kindia</small></td><td><span className="bg bg-o">Essai — j.9/30</span></td><td className="gnf mono">14</td><td>03/07</td><td><Link className="btn btn-o btn-sm" href="/admin/entreprises/garaya-holding">Ouvrir</Link></td></tr>
              <tr><td><b>PHARMA PLUS SARLU</b><br /><small style={{ color: "var(--gris)" }}>Santé · Conakry</small></td><td><span className="bg bg-v">Starter</span></td><td className="gnf mono">8</td><td>28/06</td><td><Link className="btn btn-o btn-sm" href="/admin/entreprises/garaya-holding">Ouvrir</Link></td></tr>
            </tbody>
          </table>
        </div>
        <div className="panel">
          <div className="hd"><h3>À traiter</h3><span className="sp" /><span className="bg bg-r">5</span></div>
          <div className="bd" style={{ paddingTop: 14 }}>
            <div className="alert rg"><span className="ic">💳</span><div><b>Impayé — INJELEC-GUINÉE</b> (Business, 3e échec). <span className="link" onClick={() => om("mRelance")}>Relancer →</span></div></div>
            <div className="alert rg"><span className="ic">🎧</span><div><b>Ticket urgent #248 — GARAYA HOLDING :</b> « écart RTS sur bulletin ». <span className="link" onClick={() => om("mTicket")}>Ouvrir →</span></div></div>
            <div className="alert or"><span className="ic">⚖</span><div><b>Veille légale :</b> projet de révision du barème RTS annoncé par la DNI. <Link className="link" href="/admin/baremes">Préparer une version →</Link></div></div>
            <div className="alert or"><span className="ic">⏳</span><div><b>3 essais expirent sous 5 jours</b> sans plan choisi. <span className="link" onClick={() => om("mAnnonce")}>Envoyer un rappel →</span></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
