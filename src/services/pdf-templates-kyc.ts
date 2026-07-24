import type { FieldSchema } from "./pdf-templates"

// ─── Fiche d'identification personne physique (KYC) — modèle HTML brut ── //
// Contenu complet (3 pages A4) rendu tel quel par le backend (WeasyPrint + Jinja2),
// indépendamment du système de `styles` utilisé par les modèles de devis.
export const KYC_TEMPLATE_NAME = "Fiche d'identification (KYC)"

export const KYC_FIELDS_SCHEMA: FieldSchema[] = [
  { key: "civilite", label: "Civilité", type: "string", required: false },
  { key: "nom", label: "Nom(s)", type: "string", required: true },
  { key: "prenom", label: "Prénom(s)", type: "string", required: true },
  { key: "nom_jeune_fille", label: "Nom de jeune fille", type: "string", required: false },
  { key: "date_naissance", label: "Date de naissance", type: "string", required: true },
  { key: "lieu_naissance", label: "Lieu de naissance", type: "string", required: true },
  { key: "nationalite", label: "Nationalité", type: "string", required: true },
  { key: "date_embauche", label: "Date d'embauche", type: "string", required: false },
  { key: "situation_famille", label: "Situation de famille", type: "string", required: false },
  { key: "telephone_domicile", label: "Téléphone domicile", type: "string", required: false },
  { key: "portable", label: "Portable", type: "string", required: true },
  { key: "email", label: "E-mail", type: "string", required: false },
  { key: "photo_url", label: "Photo d'identité", type: "string", required: false },

  { key: "cni_type", label: "Type de pièce", type: "string", required: false },
  { key: "cni_numero", label: "N° pièce d'identité", type: "string", required: true },
  { key: "cni_delivre_a", label: "Délivré à", type: "string", required: false },
  { key: "cni_par", label: "Délivré par", type: "string", required: false },
  { key: "cni_date_emission", label: "Date d'émission", type: "string", required: false },
  { key: "cni_date_expiration", label: "Date d'expiration", type: "string", required: false },
  { key: "cni_recto_url", label: "CNI recto (image)", type: "string", required: false },
  { key: "cni_verso_url", label: "CNI verso (image)", type: "string", required: false },

  { key: "arrondissement", label: "Arrondissement", type: "string", required: false },
  { key: "quartier", label: "Quartier", type: "string", required: false },
  { key: "rue", label: "Rue N°", type: "string", required: false },
  { key: "localite", label: "Localité", type: "string", required: true },
  { key: "reference_facture", label: "Référence facture", type: "string", required: false },
  { key: "residence_statut", label: "Statut de résidence", type: "string", required: false },

  { key: "employeur_raison_sociale", label: "Raison sociale employeur", type: "string", required: false },
  { key: "employeur_telephone", label: "Téléphone employeur", type: "string", required: false },
  { key: "employeur_email", label: "E-mail employeur", type: "string", required: false },

  { key: "ppe_reponse", label: "Affiliation PPE", type: "string", required: false },
  { key: "ppe_nom_prenom", label: "PPE — Nom et prénom", type: "string", required: false },
  { key: "ppe_fonction", label: "PPE — Fonction", type: "string", required: false },
  { key: "ppe_lien_parente", label: "PPE — Lien de parenté", type: "string", required: false },

  { key: "date", label: "Date de signature", type: "string", required: true },
  { key: "lieu", label: "Lieu de signature", type: "string", required: true },
  { key: "user_id", label: "Identifiant utilisateur", type: "string", required: false },
  { key: "msisdn_mpos", label: "MSISDN Mpos", type: "string", required: false },
  { key: "profil", label: "Profil", type: "string", required: false },
  { key: "periode", label: "Période (pied de page)", type: "string", required: false },
]

// ─── Données fictives pour l'aperçu (aucune donnée personnelle réelle) ── //
export const KYC_SAMPLE_DATA: Record<string, string | number> = {
  civilite: "Monsieur",
  nom: "NOM DE FAMILLE",
  prenom: "Prénom",
  nom_jeune_fille: "-",
  date_naissance: "01/01/1990",
  lieu_naissance: "Pointe-Noire",
  nationalite: "Congolaise",
  date_embauche: "01/01/2026",
  situation_famille: "Célibataire",
  telephone_domicile: "",
  portable: "242 06 000 0000",
  email: "",
  photo_url: "",

  cni_type: "CNI",
  cni_numero: "NR0000A00X0XX",
  cni_delivre_a: "Dolisie",
  cni_par: "Officier d'état civil",
  cni_date_emission: "01/01/2025",
  cni_date_expiration: "01/01/2035",
  cni_recto_url: "",
  cni_verso_url: "",

  arrondissement: "Arrondissement",
  quartier: "Quartier",
  rue: "-",
  localite: "Pointe-Noire",
  reference_facture: "",
  residence_statut: "Non-résident",

  employeur_raison_sociale: "DIBYX SARL",
  employeur_telephone: "+242 06 000 0000",
  employeur_email: "contact@entreprise.io",

  ppe_reponse: "Non",
  ppe_nom_prenom: "-",
  ppe_fonction: "-",
  ppe_lien_parente: "-",

  date: "01/01/2026",
  lieu: "Pointe-Noire",
  user_id: "",
  msisdn_mpos: "242 06 000 0000",
  profil: "Acquisition Agent",
  periode: "Juillet26",

  // Champs "devis" partagés par le pipeline de rendu backend — sans rapport avec
  // la fiche KYC elle-même, mais fournis avec des valeurs neutres pour éviter une
  // erreur de formatage (Undefined.__format__) si le rendu commun les référence.
  numero_devis: "",
  date_emission: "",
  date_validite: "",
  sous_total: 0,
  tva_taux: 0,
  tva_montant: 0,
  total: 0,
}

export const KYC_TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Fiche d'identification personne physique (KYC)</title>
<style>
  /* ─── Print / page setup (WeasyPrint) ──────────────────────────────── */
  @page {
    size: A4;
    margin: 18mm 16mm 16mm 16mm;
    @bottom-left  { content: element(footer-left); }
    @bottom-right { content: element(footer-right); }
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    color: #1a1a1a;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ─── Screen-only: simulate real A4 sheets (210 × 297mm) ───────────── */
  body { background: #e4e4e4; }

  .a4-sheet {
    position: relative;
    width: 210mm;
    min-height: 297mm;
    margin: 10mm auto;
    padding: 18mm 16mm 16mm 16mm;
    background: #fff;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.22);
  }

  .screen-footer {
    position: absolute;
    left: 16mm;
    right: 16mm;
    bottom: 8mm;
    display: flex;
    justify-content: space-between;
    font-size: 8.5pt;
    color: #333;
  }
  .screen-footer .right { text-align: right; }
  .screen-footer em { font-style: italic; }

  /* ─── Print: real A4 page via @page, no on-screen sheet chrome ─────── */
  @media print {
    body { background: #fff; }
    .a4-sheet {
      width: auto;
      min-height: auto;
      margin: 0;
      padding: 0;
      box-shadow: none;
      break-after: page;
    }
    .a4-sheet:last-child { break-after: auto; }
    .screen-footer { display: none; }         /* replaced by running() footer below */
  }

  /* ─── Running footer (print only, repeats on every physical page) ──── */
  .footer-left  { position: running(footer-left);  font-size: 8.5pt; color: #333; }
  .footer-right { position: running(footer-right); font-size: 8.5pt; color: #333; text-align: right; }
  .footer-right em { font-style: italic; }

  /* ─── Header / identity photo ──────────────────────────────────────── */
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 18px;
  }
  .doc-title { padding-top: 6px; }
  .doc-title h1 {
    font-size: 15pt;
    font-weight: bold;
    letter-spacing: .5px;
    margin: 0 0 2px;
    text-transform: uppercase;
    color: #111;
  }
  .doc-title .subtitle { font-size: 11.5pt; color: #222; }

  .id-photo {
    width: 34mm;
    height: 42mm;
    object-fit: cover;
    background: #f2c94c;               /* fond jaune photo d'identité */
    border: 1px solid #d9d9d9;
    display: block;
  }

  /* ─── Section band (grey rounded header) ───────────────────────────── */
  .section-band {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #eeeeee;
    border-radius: 18px;
    padding: 7px 20px;
    margin: 22px 0 12px;
    page-break-after: avoid;
  }
  .section-band .num  { font-size: 10.5pt; font-weight: bold; color: #333; min-width: 22px; }
  .section-band .name { font-size: 11pt; color: #333; }

  .section-band.centered {
    justify-content: center;
    text-align: center;
  }
  .section-band.centered .name { font-weight: bold; font-size: 12pt; }

  /* ─── Key/value rows with alternating shading ──────────────────────── */
  table.kv {
    width: 100%;
    border-collapse: collapse;
    margin: 0;
  }
  table.kv td {
    padding: 5px 8px;
    vertical-align: top;
    font-size: 11pt;
  }
  table.kv td.key   { width: 42%; color: #1a1a1a; }
  table.kv td.value { color: #111; font-weight: 500; }
  table.kv tr:nth-child(odd) td { background: #f4f4f4; }   /* lignes alternées */

  .civility { font-size: 11.5pt; margin: 4px 2px 8px; }

  /* ─── Engagement text ──────────────────────────────────────────────── */
  .engagement-text { margin: 6px 2px 4px; }
  .engagement-text p { margin: 0 0 10px; }
  .engagement-text b { font-weight: bold; }
  .engagement-text em { font-style: italic; color: #333; }

  /* ─── Signatures ───────────────────────────────────────────────────── */
  .signatures {
    display: flex;
    gap: 24px;
    margin-top: 34px;
  }
  .sign-block {
    flex: 1;
    text-align: center;
  }
  .sign-block .sign-label { font-weight: bold; font-size: 11pt; margin-bottom: 4px; }
  .sign-block .sign-area {
    height: 46mm;
  }

  /* ─── ID card images (page 3) ──────────────────────────────────────── */
  .id-cards {
    display: flex;
    gap: 18px;
    margin-top: 30px;
  }
  .id-card {
    flex: 1;
    aspect-ratio: 1.586;              /* format carte ID-1 */
    border: 1px solid #d9d9d9;
    background: #eef3f2;
    overflow: hidden;
  }
  .id-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
</style>
</head>
<body>

  <!-- Running footer (print only), rendu en bas de chaque page physique -->
  <div class="footer-left">MTN Congo S.A.</div>
  <div class="footer-right">Partenaire : DIBYX SARL<br><em>{{ periode | default('Juillet26') }}</em></div>

  <!-- ══════════════════════════ PAGE 1 ══════════════════════════ -->
  <section class="a4-sheet">
  <header class="doc-header">
    <div class="doc-title">
      <h1>Fiche identification personne physique</h1>
      <div class="subtitle">(Know Your Customer)</div>
    </div>
    <img class="id-photo" src="{{ photo_url }}" alt="Photo d'identité" />
  </header>

  <!-- I — Renseignements sur l'identité -->
  <div class="section-band">
    <span class="num">I&nbsp;-</span>
    <span class="name">Renseignements sur l'identité</span>
  </div>

  <div class="civility">{{ civilite | default('Monsieur') }}</div>

  <table class="kv">
    <tr><td class="key">Nom (s) :</td>             <td class="value">{{ nom }}</td></tr>
    <tr><td class="key">Prénom (s) :</td>          <td class="value">{{ prenom }}</td></tr>
    <tr><td class="key">Nom de jeune fille :</td>  <td class="value">{{ nom_jeune_fille | default('-') }}</td></tr>
    <tr><td class="key">Date de naissance :</td>   <td class="value">{{ date_naissance }}</td></tr>
    <tr><td class="key">Lieu de naissance :</td>   <td class="value">{{ lieu_naissance }}</td></tr>
    <tr><td class="key">Nationalité :</td>         <td class="value">{{ nationalite }}</td></tr>
    <tr><td class="key">Date d'embauche :</td>     <td class="value">{{ date_embauche }}</td></tr>
    <tr><td class="key">Situation de famille :</td><td class="value">{{ situation_famille }}</td></tr>
    <tr><td class="key">Téléphone domicile :</td>  <td class="value">{{ telephone_domicile | default('') }}</td></tr>
    <tr><td class="key">Portable :</td>            <td class="value">{{ portable }}</td></tr>
    <tr><td class="key">E-mail :</td>              <td class="value">{{ email | default('') }}</td></tr>
  </table>

  <!-- Pièce d'identité -->
  <div class="section-band centered">
    <span class="name">Pièce d'identité</span>
  </div>

  <table class="kv">
    <tr><td class="key">Type :</td>      <td class="value">{{ cni_type | default('CNI') }}</td></tr>
    <tr><td class="key">N° :</td>        <td class="value">{{ cni_numero }}</td></tr>
    <tr><td class="key">Délivré à :</td> <td class="value">{{ cni_delivre_a }}</td></tr>
    <tr><td class="key">Par :</td>       <td class="value">{{ cni_par }}</td></tr>
    <tr><td class="key">Le :</td>        <td class="value">{{ cni_date_emission }}</td></tr>
    <tr><td class="key">Expire-le :</td> <td class="value">{{ cni_date_expiration }}</td></tr>
  </table>

  <!-- II — Adresse Géographique -->
  <div class="section-band">
    <span class="num">II&nbsp;-</span>
    <span class="name">Adresse Géographique</span>
  </div>

  <table class="kv">
    <tr><td class="key">Arrondissement :</td>                 <td class="value">{{ arrondissement }}</td></tr>
    <tr><td class="key">Quartier :</td>                       <td class="value">{{ quartier }}</td></tr>
    <tr><td class="key">Rue N° :</td>                         <td class="value">{{ rue | default('-') }}</td></tr>
    <tr><td class="key">Localité :</td>                       <td class="value">{{ localite }}</td></tr>
    <tr><td class="key">Référence facture (Eau ou Electricité) :</td><td class="value">{{ reference_facture | default('') }}</td></tr>
    <tr><td class="key">{{ residence_statut | default('Non-résident') }}</td><td class="value"></td></tr>
  </table>

  <!-- III — Employeur (Digital Partner) -->
  <div class="section-band">
    <span class="num">III&nbsp;-</span>
    <span class="name">Employeur (Digital Partner)</span>
  </div>

  <table class="kv">
    <tr><td class="key">Raison Sociale :</td> <td class="value">{{ employeur_raison_sociale | default('DIBYX SARL') }}</td></tr>
    <tr><td class="key">Téléphone :</td>      <td class="value">{{ employeur_telephone }}</td></tr>
    <tr><td class="key">E-mail :</td>         <td class="value">{{ employeur_email }}</td></tr>
  </table>

  <div class="screen-footer">
    <span>MTN Congo S.A.</span>
    <span class="right">Partenaire : DIBYX SARL<br><em>{{ periode | default('Juillet26') }}</em></span>
  </div>
  </section>

  <!-- ══════════════════════════ PAGE 2 ══════════════════════════ -->
  <section class="a4-sheet">

  <!-- V — Affiliation PPE -->
  <div class="section-band">
    <span class="num">V&nbsp;-</span>
    <span class="name">Affiliation aux personnes politiquement exposées</span>
  </div>

  <p class="engagement-text" style="margin-top:2px;">
    Une personne de votre famille exerce-t-elle ou a-t-elle exercé une fonction politique,
    juridictionnelle ou administrative importante : <b>{{ ppe_reponse | default('Non') }}</b>
  </p>

  <table class="kv" style="margin-top:8px;">
    <tr><td class="key">Si Oui, Nom(s) et Prénom(s) de la personne</td><td class="value">{{ ppe_nom_prenom | default('-') }}</td></tr>
    <tr><td class="key">Fonction de la personne :</td>              <td class="value">{{ ppe_fonction | default('-') }}</td></tr>
    <tr><td class="key">Lien de parenté :</td>                      <td class="value">{{ ppe_lien_parente | default('-') }}</td></tr>
  </table>

  <!-- IV — Engagement -->
  <div class="section-band">
    <span class="num">IV&nbsp;-</span>
    <span class="name">Engagement</span>
  </div>

  <div class="engagement-text">
    <p>Je déclare et garantis que les informations communiquées sont <b>exactes</b> et <b>sincères</b>.</p>
    <p>Je m'engage, par ailleurs, à informer à mon employeur toutes modifications de ma situation au
       plus tard dans les <b>30 jours dudit</b> changement
       <em>(dans ce cas, une nouvelle fiche d'identification doit être signée par le déclarant)</em>.</p>
  </div>

  <table class="kv" style="margin-top:16px;">
    <tr><td class="key">Date :</td>        <td class="value">{{ date }}</td></tr>
    <tr><td class="key">Lieu :</td>        <td class="value">{{ lieu }}</td></tr>
    <tr><td class="key">Users</td>         <td class="value">{{ user_id }}</td></tr>
    <tr><td class="key">MSISDN Mpos</td>   <td class="value">{{ msisdn_mpos }}</td></tr>
    <tr><td class="key">Profil</td>        <td class="value">{{ profil | default('Acquisition Agent') }}</td></tr>
  </table>

  <div class="signatures">
    <div class="sign-block">
      <div class="sign-label">Signature</div>
      <div class="sign-label">Agent Acquisition</div>
      <div class="sign-area"></div>
    </div>
    <div class="sign-block">
      <div class="sign-label">Signature</div>
      <div class="sign-label">Digital Partenaire</div>
      <div class="sign-area"></div>
    </div>
  </div>

  <div class="screen-footer">
    <span>MTN Congo S.A.</span>
    <span class="right">Partenaire : DIBYX SARL<br><em>{{ periode | default('Juillet26') }}</em></span>
  </div>
  </section>

  <!-- ══════════════════════════ PAGE 3 ══════════════════════════ -->
  <section class="a4-sheet">

  <div class="id-cards">
    <div class="id-card">
      <img src="{{ cni_recto_url }}" alt="CNI recto" />
    </div>
    <div class="id-card">
      <img src="{{ cni_verso_url }}" alt="CNI verso" />
    </div>
  </div>

  <div class="screen-footer">
    <span>MTN Congo S.A.</span>
    <span class="right">Partenaire : DIBYX SARL<br><em>{{ periode | default('Juillet26') }}</em></span>
  </div>
  </section>

</body>
</html>
`
