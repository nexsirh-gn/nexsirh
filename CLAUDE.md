# CLAUDE.md — Règles du projet Nex'SIRH Guinée (SaaS)

> Ce fichier est le contexte permanent des agents IA (Claude Code, Antigravity).
> **Lis-le entièrement avant toute tâche.** En cas de conflit entre ce fichier et
> une improvisation, ce fichier gagne. En cas de conflit entre ce fichier et les
> **fixtures de paie GARAYA** (section 7), **les fixtures gagnent** : signale
> l'écart à l'humain au lieu de trancher seul.

---

## 1. Le projet en une phrase

SaaS RH multi-tenant pour PME guinéennes (≤ 100 salariés) : personnel, paie
conforme (CNSS, RTS, VF, CFPA), congés, temps, documents légaux, portail
employé, console admin plateforme. Migration d'un SIRH Excel/VBA validé en
production — les règles métier sont **déjà validées**, ne les réinvente pas.

**Références visuelles (spécification UI, fidélité stricte exigée) :**
- `design/Maquettes_NexSIRH_SaaS.html` — application cliente (thème vert/or)
- `design/Console_Admin_NexSIRH.html` — console admin plateforme (anthracite/or)

**Références écrites :** `docs/Plan_SaaS_NexSIRH_Guinee.docx` (plan 7 phases),
`docs/Etapes_Realisation_A_Z_NexSIRH.docx` (guide d'exécution, 26 étapes).

---

## 2. Stack et commandes

| Couche | Choix |
|---|---|
| Framework | Next.js 15, App Router, **TypeScript strict** |
| UI | Tailwind CSS + shadcn/ui |
| Base | Supabase (PostgreSQL), **RLS partout** |
| Auth | Supabase Auth (email/mot de passe) |
| Fichiers | Supabase Storage (PDF, imports) |
| Paiement | Stripe (webhooks → table `subscriptions`) |
| Emails | Resend |
| PDF | génération côté serveur (Route Handler) |
| Graphiques | Recharts |
| Tests | Vitest (unitaires), Playwright (E2E) |
| Déploiement | Vercel (main → prod, branche → preview) |

```bash
npm run dev            # développement
npm test               # unitaires (DOIT être vert avant tout commit)
npm run test:e2e       # Playwright
npm run lint           # ESLint + Prettier
supabase db push       # appliquer les migrations en dev
supabase migration new <nom>   # créer une migration
```

---

## 3. Structure des dossiers

```
app/(auth)/            connexion, inscription (3 étapes), mot-de-passe-oublie
app/(app)/             dashboard, employes, paie, conges, temps, documents,
                       rapports, parametrage, abonnement
app/(portail)/         portail employé : accueil, mes-bulletins, mes-conges
app/(admin)/           console plateforme (super-admin uniquement)
lib/paie/              calculs purs + tests (AUCUN accès UI ni réseau)
lib/conges/            jours ouvrables, soldes, majorations
lib/supabase/          clients (browser / server / service_role)
components/            UI réutilisable (Badge, MontantGNF, Panel, KpiCard,
                       DataTable, Modal, Toast…)
supabase/migrations/   schéma SQL versionné — IMMUABLE une fois appliqué
tests/paie/            garaya.fixtures.ts (vérité absolue) + tests
design/                maquettes HTML de référence
docs/                  plan, guide A→Z
```

---

## 4. Conventions

- **Langue :** UI, messages, commentaires de code métier → **français**.
  Noms de tables/colonnes/variables → **anglais** (`employees`, `payslips`).
- **Montants :** GNF, **entiers**, stockés en `integer`/`bigint`. Jamais de
  `float` pour de l'argent. Affichage via `formatGNF()` (IBM Plex Mono,
  séparateur espace fine : `3 745 000`). Règle d'arrondi des calculs de paie :
  voir §6.8.
- **Dates :** `date`/`timestamptz` en base, affichage `JJ/MM/AAAA`.
- **Matricules :** `EMP-001`, `EMP-002`… générés côté serveur, uniques par
  entreprise, non modifiables.
- **IDs :** `uuid` partout. Toute table métier porte `company_id uuid not null
  references companies(id)`.
- **Commits :** français, impératif, préfixe module — `paie: calcul RTS
  tranche par tranche`.
- **Une branche = une étape du guide A→Z.** Jamais de travail direct sur main.

---

## 5. Sécurité — règles absolues

1. **RLS activée sur toutes les tables**, sans exception. Policy de base :
   `company_id = current_company_id()`, affinée par rôle.
2. **Rôles :** `admin`, `rh`, `dg`, `manager`, `comptable`, `employe`
   (+ `super_admin` hors tenant pour la console).
   - `manager` : lit **son équipe uniquement**, **jamais les salaires**.
   - `comptable` : paie en **lecture seule**.
   - `employe` : **ses propres lignes uniquement** (bulletins, congés).
   - `dg` : tout en lecture.
3. **`service_role` uniquement côté serveur** (Server Actions / Route
   Handlers). Jamais importé dans un composant client. Jamais dans le bundle.
4. **Secrets** : variables d'environnement Vercel/`.env.local` (giti-ignoré).
   Aucun secret, clé, mot de passe dans le code ou les commits.
5. **Audit** : toute écriture sur `employees`, `payslips`, `tax_brackets`,
   `contribution_rates`, `subscriptions` passe par des triggers vers
   `audit_log` (acteur, avant/après, horodatage). `audit_log` est append-only.
6. **Migrations appliquées = immuables.** Pour corriger : nouvelle migration.

---

## 6. Règles métier — PAIE (le cœur du produit)

### 6.1 Chaîne de calcul (ordre strict)

```
1. total_brut       = salaire_base + prime_anciennete + prime_repas
                      + indemnite_logement + indemnite_transport
                      + indemnite_cherte_vie + heures_sup + autres_primes
2. base_cnss        = MIN(total_brut, 2 500 000)
3. cnss_salariale   = base_cnss × 5 %
4. cnss_patronale   = base_cnss × 18 %
5. net_imposable    = total_brut − cnss_salariale
                      − indemnite_logement − indemnite_transport
                      − indemnite_cherte_vie − prime_repas        (cf. §6.4)
6. rts              = barème progressif appliqué à net_imposable  (cf. §6.3)
7. vf (patronal)    = assiette_vf × 6 %                           (cf. §6.5)
8. cfpa (patronal)  = total_brut × 1,5 %
9. net_a_payer      = total_brut − cnss_salariale − rts
                      − avances − prets − autres_retenues
```

Les barèmes et taux sont **lus en base** (`tax_brackets`,
`contribution_rates`, versionnés par date d'effet via `getBaremeAt(date)`).
**Interdiction absolue de coder un taux ou un plafond en dur.**

### 6.2 Cotisations (v2026.1)

| Cotisation | Salariale | Patronale | Assiette |
|---|---|---|---|
| CNSS | 5 % | 18 % | brut plafonné à **2 500 000 GNF/mois** |
| Versement Forfaitaire | — | 6 % | brut − MIN(150 000 ; 6 % × brut) — cf. §6.5 |
| CFPA | — | 1,5 % | total brut |

### 6.3 Barème RTS v2026.1 (référence : dossier de passation)

Appliqué **tranche par tranche** au net imposable :

| Tranche | De | À | Taux |
|---|---|---|---|
| 0 | 0 | 1 000 000 | **0 %** |
| 1 | 1 000 000 | 3 000 000 | **5 %** |
| 2 | 3 000 000 | 6 000 000 | **8 %** |
| 3 | 6 000 000 | 11 000 000 | **10 %** |
| 4 | au-delà de 11 000 000 | | **15 %** |

> **Justification par les bulletins réels :** PLEGNEMOU a un net imposable de
> 3 585 000 → 0 % sur 1 000 000, 5 % sur 2 000 000 (= 100 000), 8 % sur
> 585 000 (= 46 800) → RTS 146 800. ✓ Conforme au bulletin Sage.
> Le dossier de passation exprimait le même barème **après abattement de la
> tranche à 0 %** (« 5 % de 0 à 2 M ; 8 % de 2 à 5 M… » sur l'assiette
> résiduelle). Les deux écritures sont équivalentes ; en base, on stocke le
> barème ci-dessus (tranches sur le net imposable, tranche 0 incluse).

### 6.4 Assiette du net imposable — confirmée par les 8 bulletins

Sont **exclues** du net imposable : indemnités de **logement**, **transport**,
**cherté de vie** ET **prime de repas** (vérifié sur les 8 bulletins).
La **prime d'ancienneté est imposable**.

### 6.5 Assiette du Versement Forfaitaire — CONFIRMÉE (arbitrage du 17/07/2026)

**Formule unique pour tous les salariés :**

```
assiette_vf = brut − MIN(150 000 GNF ; 6 % × brut)
```

Vérifiée **0 GNF d'écart sur les 8 bulletins GARAYA**. Les deux comportements
apparents des bulletins (abattement fixe vs brut × 94 %) sont les deux faces
de la même formule : SYLLA et CAMARA tombent simplement sous le plafond
(6 % × brut < 150 000). Le plafond (150 000) et le taux (6 %) restent des
paramètres de `contribution_rates` (`abatement_type = 'min_fixed_rate'`,
`abatement_value`), jamais codés en dur. Aucune surcharge par salarié.

### 6.6 Cycle de paie

`brouillon` → `validé` → `clôturé`.
- Brouillon : recalcul et suppression autorisés ; les saisies manuelles
  (avances, retenues) **survivent au recalcul**.
- Clôturé : montants **figés** (trigger SQL rejette tout UPDATE), bulletins
  archivés. Correction ultérieure = **rappel/reprise sur le mois suivant**,
  jamais de réouverture.

### 6.7 Retenues

Avances et prêts avec échéancier (cf. FAYE : mensualité 2 016 982 GNF).
Une retenue ne peut pas rendre le net négatif → erreur bloquante à la
génération, jamais de silencieux.

### 6.8 Arrondis

Les bulletins source contiennent des demi-francs (ex. RTS SYLLA 29 462,5).
Règle : **calculs en centimes exacts, arrondi final à l'entier GNF au moment
du stockage** (round half up). Les tests fixtures tolèrent ±1 GNF sur les
lignes issues d'un demi-franc, **0 GNF d'écart partout ailleurs**.

---

## 7. FIXTURES GARAYA — vérité absolue (`tests/paie/garaya.fixtures.ts`)

Période décembre 2025. Tout moteur de paie DOIT reproduire ces montants.
Interdiction de modifier ce tableau pour « faire passer » un test.

| Mat. | Salarié | Base | Anc. | Repas | Logem. | Transp. | Cherté | **Brut** | CNSS sal. | Net impos. | **RTS** | VF (pat.) | CFPA | Retenue | **Net à payer** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 002 | FAYE Aboubacar | 3 000 000 | 120 000 | 150 000 | 150 000 | 225 000 | 100 000 | **3 745 000** | 125 000 | 2 995 000 | **99 750** | 215 700 | 56 175 | 2 016 982 (prêt) | **1 503 268** |
| 004 | TOLNO Michel | 2 500 000 | 245 000 | 160 000 | 150 000 | 160 000 | 140 000 | **3 355 000** | 125 000 | 2 620 000 | **81 000** | 192 300 | 50 325 | — | **3 149 000** |
| 005 | TRAORE Aminata | 2 000 000 | 135 000 | 150 000 | 250 000 | 120 000 | 90 000 | **2 745 000** | 125 000 | 2 010 000 | **50 500** | 155 700 | 41 175 | — | **2 569 500** |
| 006 | SYLLA Aboubacar | 1 500 000 | 200 000 | 100 000 | 150 000 | 150 000 | 115 000 | **2 215 000** | 110 750 | 1 589 250 | **29 463** | 124 926 | 33 225 | — | **2 074 788** |
| 007 | CAMARA Bountouraby | 1 600 000 | 235 000 | 150 000 | 150 000 | 134 000 | 120 000 | **2 389 000** | 119 450 | 1 715 550 | **35 778** | 134 740 | 35 835 | — | **2 233 773** |
| 008 | BARRY Moussa | 1 800 000 | 235 000 | 150 000 | 150 000 | 134 000 | 120 000 | **2 589 000** | 125 000 | 1 910 000 | **45 500** | 146 340 | 38 835 | — | **2 418 500** |
| 009 | PLEGNEMOU Gassim | 3 500 000 | 210 000 | 165 000 | 250 000 | 215 000 | 140 000 | **4 480 000** | 125 000 | 3 585 000 | **146 800** | 259 800 | 67 200 | — | **4 208 200** |
| 010 | CONTE Ousmane | 2 000 000 | 146 000 | 150 000 | 150 000 | 130 000 | 80 000 | **2 656 000** | 125 000 | 2 021 000 | **51 050** | 150 360 | 39 840 | — | **2 479 950** |

Cas limites couverts : brut **sous** le plafond CNSS (SYLLA, CAMARA : base
CNSS = brut), **franchissement de tranche RTS** (PLEGNEMOU : 5 % + 8 %),
**prêt personnel** (FAYE), CNSS patronale = base × 18 % partout.

---

## 8. Règles métier — CONGÉS & TEMPS

- **Congés annuels :** 2,5 jours **ouvrables**/mois travaillé (30 j/an)
  + **1 jour par tranche de 5 ans d'ancienneté**. Report N-1 possible.
- **Jours ouvrables :** lundi→vendredi, hors jours fériés guinéens
  (`public_holidays`, table globale par année).
- **Congé maternité :** 98 jours (14 semaines), rémunéré.
- **Workflow :** demande → validation **Manager** → validation **RH** → solde
  mis à jour. Motif obligatoire en cas de refus. Notifications email à chaque
  transition. Absences non rémunérées → déduction transmise à la paie.
- **Temps :** base légale 40 h/semaine, 173,33 h/mois. Heures sup :
  **+25 %** (8 premières h/sem.), **+50 %** au-delà, **+100 %** dimanches et
  jours fériés. **Formule (seule source de vérité, décision du 17/07/2026) :**
  taux horaire = salaire_base / 173,33 ; montant = taux × (h25×1,25 + h50×1,5
  + h100×2), **arrondi au GNF une seule fois sur le total final**.
  (L'ancien cas de contrôle « 254 810 GNF » était une valeur illustrative de
  maquette non vérifiée — supprimé ; la formule donne 253 851 pour ce cas.)
- **Contrats :** âge minimum **16 ans** ; CDD ≤ **24 mois**, 1 renouvellement,
  date de fin obligatoire ; alertes à J-30 (CDD, pièces d'identité, fin
  d'essai).

---

## 9. Design — fidélité aux maquettes

Tokens (déjà dans `tailwind.config`) :

```
vert #0F5C49 · vert-fonce #0A3F33 · menthe #E7F2EE · encre #1C2422
papier #F6F8F7 · or #D9A441 · rouge #C24B3A · bleu #2E6E8E · ligne #DFE8E4
Titres : Bricolage Grotesque · Corps : Public Sans · Montants : IBM Plex Mono
Console admin : anthracite #17201D / #0F1614, accents or.
```

Règles : **tout montant GNF en Plex Mono tabulaire** ; badges de statut avec
point coloré ; modales de confirmation pour toute action destructive ou
irréversible (clôture de paie = saisie du mot « CLOTURER ») ; toasts de
confirmation après chaque action réussie.

---

## 10. Interdits absolus

1. ❌ Taux, plafond ou barème **codé en dur** — tout vient de la base.
2. ❌ Modifier une **migration déjà appliquée** ou les **fixtures GARAYA**.
3. ❌ `service_role` / secrets côté client ou dans un commit.
4. ❌ Créer/modifier une table **sans policy RLS** livrée dans la même
   migration.
5. ❌ Modifier un salaire par UPDATE direct : toujours via un **mouvement**
   journalisé (ancienne/nouvelle valeur, motif, date d'effet).
6. ❌ UPDATE/DELETE sur un bulletin **clôturé**.
7. ❌ `float` pour des montants ; `any` en TypeScript.
8. ❌ Merger si `npm test` échoue ou si les tests d'isolation tenant échouent.
9. ❌ Supprimer des données client (suspension = lecture seule, réversible).
10. ❌ Trancher seul une ambiguïté métier (ex. §6.5) : demander l'arbitrage.

---

## 11. Workflow d'une session agent

1. Lire la tâche dans le guide A→Z + la section concernée de ce fichier.
2. Créer/rejoindre la branche de l'étape.
3. **Si la tâche touche la paie : écrire/étendre les tests d'abord.**
4. Implémenter petit ; exécuter `npm test` + lint localement.
5. Migrations : une par changement, avec ses policies RLS et ses triggers
   d'audit.
6. Vérifier visuellement contre la maquette HTML correspondante.
7. Résumer en fin de session : fichiers touchés, décisions prises, points
   laissés à l'arbitrage humain.

---

*Version 1.0 — 12/07/2026. Toute modification de ce fichier est validée par
l'humain responsable du projet et committée avec le motif du changement.*
