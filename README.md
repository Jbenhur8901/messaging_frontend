# messaging_frontend

Interface web de gestion de campagnes SMS (dashboard, contacts, templates, credits, services et outils SMS).

## Fonctionnalites
- Tableau de bord avec statistiques et performances recentes
- Gestion des contacts (recherche, tags, import, blocage)
- Creation et suivi des campagnes SMS
- Bibliotheque de templates SMS
- Credits: solde, consommation et historique
- Services de messagerie par cas d'usage
- Outils SMS: analyse de longueur, caracteres speciaux, optimisation
- Organisation et parametres de securite (mot de passe, 2FA)

## Stack
- Next.js 16 / React 19 / TypeScript
- Tailwind CSS + Radix UI
- Zustand / React Hook Form / Zod
- Axios

## Prerequis
- Node.js 20+ (recommande)
- Un backend API compatible (voir configuration)

## Installation
```bash
npm install
```

## Configuration
Definissez l'URL de l'API dans un fichier `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
# Active des logs API cote navigateur
NEXT_PUBLIC_DEBUG_API=false
```

## Demarrage
```bash
npm run dev
```

## Build
```bash
npm run build
npm start
```

## Lint
```bash
npm run lint
```

## Documentation utilisateur
Le manuel d'utilisation se trouve dans `MANUEL_UTILISATION.md`.

## Notes
- L'authentification et les tokens sont stockes dans le navigateur (localStorage).
- Certaines vues restent vides sans session active ou sans cle API.
