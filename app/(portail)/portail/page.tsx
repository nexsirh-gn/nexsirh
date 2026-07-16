"use client";

import { useModal } from "@/components/providers";

export default function PortailAccueil() {
  const { om } = useModal();
  return (
    <div>
      <div className="kpis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="kpi gold">
          <div className="l">Dernier net perçu · Juin</div>
          <div className="v">2 233 773 <span style={{ fontSize: 12, color: "var(--gris)" }}>GNF</span></div>
          <div className="d"><span className="link" onClick={() => om("mBulletin")}>Voir le bulletin →</span></div>
        </div>
        <div className="kpi">
          <div className="l">Solde de congés</div>
          <div className="v">12,5 j</div>
          <div className="d">demande du 04–15 août : <span className="bg bg-o">en validation RH</span></div>
        </div>
        <div className="kpi">
          <div className="l">Ancienneté</div>
          <div className="v">9,6 ans</div>
          <div className="d">+2 j de congés bonus / an</div>
        </div>
      </div>
      <div className="panel">
        <div className="hd"><h3>Actualité</h3></div>
        <div className="bd">
          <div className="alert vt"><span className="ic">✓</span><div>Votre demande de congé du <b>04 au 15 août</b> a été approuvée par votre manager. Validation RH en cours.</div></div>
          <div className="alert or"><span className="ic">📄</span><div>Votre bulletin de <b>juin 2026</b> est disponible au téléchargement.</div></div>
        </div>
      </div>
    </div>
  );
}
