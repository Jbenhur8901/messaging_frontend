# Audit UI + Guide Figma

Ce document résume l'UI actuelle de l'application et propose une méthode claire pour l'améliorer dans Figma.

## 1. Vue d'ensemble produit

- Type d'app: dashboard SaaS (auth, espace utilisateur, espace admin).
- Structure principale:
  - Auth (`/auth/*`)
  - Dashboard métier (`/(dashboard)/*`)
  - Admin (`/admin/*`)
- Navigation:
  - Sidebar + header sticky sur dashboard/admin.
  - Version mobile via menu sheet/drawer.

## 2. Système visuel actuel (Design Tokens)

Source: `src/app/globals.css`

### Couleurs (light)
- `background`: `#f7f9fc`
- `foreground`: `#0b1220`
- `card`: `#ffffff`
- `primary`: `#0b5fff`
- `muted`: `#f2f4f8`
- `muted-foreground`: `#5b677a`
- `border`: `#d8e0ea`

### Couleurs (dark)
- `background`: `#0b0f17`
- `foreground`: `#eef2f8`
- `card`: `#111827`
- `primary`: `#3b82f6`
- `muted`: `#1b2432`
- `muted-foreground`: `#94a3b8`
- `border`: `#243244`

### Radius / ombres
- Radius global: `0.75rem`
- Ombres disponibles: `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`

### Typographie
- Police principale: Inter (`--font-inter`)
- Titres avec `letter-spacing: -0.02em`

## 3. Composants UI existants

Base `shadcn/ui` + personnalisations:

- Boutons, Inputs, Select, Textarea, Table, Badge, Dialog, Sheet, Tooltip, Cards.
- Patterns récurrents:
  - Card KPI
  - Table avec actions inline
  - Dialog de confirmation/rejet/approbation
  - Badges de statut (`pending`, `approved`, `rejected`, etc.)

## 4. Layout et navigation

### Dashboard user
- Fond `bg-dashboard` (gradient en light, uni en dark).
- Sidebar desktop + nav mobile.
- Header avec switch organisation + wallet.

### Admin
- Sidebar dédiée (`AdminSidebar`) + header dédié.
- Login admin avec hero + panel formulaire.
- Pages data-heavy (tableaux, filtres, approbations).

## 5. États UX à couvrir en Figma

Pour chaque écran important:

- `Loading` (skeleton/spinner)
- `Empty` (aucune donnée)
- `Error` (message clair)
- `Success` (toast/confirmation)
- `Disabled` (permissions ou action bloquée)
- `Pending` (mutation en cours: bouton disabled + spinner)

## 6. Dark mode: points clés

Déjà en place:
- Tokens light/dark globaux.
- Fond auth et dashboard adaptés.
- Plusieurs composants utilisent `bg-background`, `text-foreground`, `border-border`.

À surveiller:
- Éviter tout hardcode type `bg-white`, `text-gray-*`, `border-white/*` hors cas volontaire.
- Vérifier contraste badge/statut en dark.
- Vérifier overlays/dialogs (lisibilité + opacité).

## 7. Accessibilité à renforcer

Checklist Figma + implémentation:

- Contraste WCAG AA (`4.5:1` texte normal).
- Taille texte minimum lisible (>= 12-13px seulement pour labels secondaires).
- Focus visible (anneau clair sur tous les éléments interactifs).
- Cibles tactiles >= 40x40.
- Cohérence des libellés d'actions.
- États disabled explicites (visuel + message).

## 8. Inventaire des pages à designer (priorité)

### Priorité haute
1. Login admin
2. Dashboard principal
3. Crédits WhatsApp
4. Crédits IA
5. Organisation / Membres
6. Admin demandes crédits (SMS + IA)

### Priorité moyenne
1. Organisations admin (liste + détail)
2. Campagnes WhatsApp
3. Contacts et tags

## 9. Spécification Figma recommandée

Crée ces pages Figma:

1. `00 Foundations`
- Color styles (light/dark)
- Text styles (Display, H1-H6, Body, Caption)
- Spacing scale (4/8/12/16/24/32...)
- Radius + shadows

2. `01 Components`
- Buttons (all variants + states)
- Inputs/select/textarea (default/focus/error/disabled)
- Badge/status chips
- Cards (KPI, content, alert)
- Table (header/row/actions/empty)
- Modal/Dialog + Sheet
- Sidebar items + Header blocks

3. `02 Templates`
- Auth template
- Dashboard template
- Admin template

4. `03 Screens`
- Chaque écran clé en light + dark
- Variantes desktop/tablet/mobile

5. `04 Flows`
- Login
- Changement d'organisation
- Demande crédit IA
- Validation admin

## 10. Design rules (pour éviter la dérive)

- Toujours utiliser les tokens (jamais de couleurs arbitraires inline).
- Un seul style de card KPI par contexte.
- Un seul système de badges de statut.
- Hiérarchie typographique stricte (pas de tailles ad hoc).
- Grille cohérente (12 colonnes desktop, 4 mobile).

## 11. Plan d'amélioration concret (2 semaines)

### Semaine 1
- Audit pixel + inventaire composants existants.
- Mise en place Foundations Figma.
- Refonte des composants partagés (Buttons/Inputs/Cards/Tables/Dialogs).

### Semaine 2
- Refonte des écrans critiques (Crédits IA/WhatsApp, Admin demandes).
- QA dark mode complète.
- QA responsive desktop/mobile.
- Handoff dev (spécifications + tokens + states).

## 12. Handoff Dev (ce qu'il faut livrer depuis Figma)

- Variables/tokens nommés (colors, spacing, radius, shadows, typography).
- Composants avec variants + states.
- Specs d'espacement/marges/paddings.
- Règles responsive par breakpoint.
- Règles d'interaction (hover/focus/active/disabled/loading).

---

Si tu veux, je peux aussi te générer une version `UI_AUDIT_FIGMA_V2.md` orientée **checklist exécutable** (case à cocher par écran/composant) pour ton équipe design/dev.
