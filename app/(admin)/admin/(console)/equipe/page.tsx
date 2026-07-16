"use client";

import { useModal, useToast } from "@/components/providers";

export default function EquipeApi() {
  const { om } = useModal();
  const toast = useToast();
  return (
    <div className="grid2">
      <div className="panel">
        <div className="hd"><h3>Équipe Nex’SIRH</h3><span className="sp" /><button className="btn btn-p btn-sm" onClick={() => om("mInviterAdmin")}>+ Inviter</button></div>
        <table>
          <tbody>
            <tr><th>Membre</th><th>Rôle console</th><th>2FA</th><th></th></tr>
            <tr><td><b>Super Admin</b> <small style={{ color: "var(--gris)" }}>admin@nexsirh.gn</small></td><td><span className="bg bg-r">Super-admin</span></td><td>✓</td><td></td></tr>
            <tr><td><b>Aïssatou DIALLO</b> <small style={{ color: "var(--gris)" }}>support@nexsirh.gn</small></td><td><span className="bg bg-o">Support</span></td><td>✓</td><td><button className="btn btn-g btn-sm" onClick={() => toast("Rôle modifié")}>✎</button></td></tr>
            <tr><td><b>Mamadou KEITA</b> <small style={{ color: "var(--gris)" }}>tech@nexsirh.gn</small></td><td><span className="bg bg-b">Technique</span></td><td>✓</td><td><button className="btn btn-g btn-sm" onClick={() => toast("Rôle modifié")}>✎</button></td></tr>
          </tbody>
        </table>
        <div className="bd">
          <div className="alert vt"><span className="ic">🛡</span><div><b>Droits :</b> Support = lecture + accès support avec consentement client. Technique = monitoring + migrations. Seul le Super-admin peut suspendre une entreprise ou publier un barème.</div></div>
        </div>
      </div>
      <div>
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="hd"><h3>Intégrations &amp; clés</h3></div>
          <table>
            <tbody>
              <tr><td><b>Stripe</b> <small style={{ color: "var(--gris)" }}>paiements</small></td><td><span className="sev ok" />Connecté</td><td><button className="btn btn-g btn-sm" onClick={() => toast("Clé Stripe régénérée — ancienne clé révoquée 🔑")}>🔑 Régénérer</button></td></tr>
              <tr><td><b>Resend</b> <small style={{ color: "var(--gris)" }}>emails</small></td><td><span className="sev ok" />Connecté</td><td><button className="btn btn-g btn-sm" onClick={() => toast("Clé Resend régénérée 🔑")}>🔑 Régénérer</button></td></tr>
              <tr><td><b>Webhook facturation</b></td><td className="mono">…/api/webhooks/stripe</td><td><button className="btn btn-g btn-sm" onClick={() => toast("Webhook testé : 200 OK ✓")}>Tester</button></td></tr>
            </tbody>
          </table>
        </div>
        <div className="panel">
          <div className="hd"><h3>Zone sensible</h3></div>
          <div className="bd">
            <div className="stat-line"><span>Mode maintenance (bannière + lecture seule)</span><button className="btn btn-o btn-sm" onClick={() => toast("Mode maintenance ACTIVÉ pour toutes les entreprises ⚠ — cliquer à nouveau pour désactiver")}>Activer</button></div>
            <div className="stat-line"><span>Restauration d’une sauvegarde</span><button className="btn btn-o btn-sm" onClick={() => toast("Assistant de restauration ouvert — nécessite une double validation")}>Ouvrir l’assistant</button></div>
          </div>
        </div>
      </div>
    </div>
  );
}
