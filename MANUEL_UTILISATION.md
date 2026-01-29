# Manuel d'utilisation - Plateforme SMS

Ce guide est concu pour un utilisateur debutant. Il explique les ecrans, le vocabulaire et les actions principales, avec des workflows pas a pas.

## 0) Lexique simple
- Contact: une personne a qui vous envoyez des SMS.
- Tag: une etiquette pour regrouper des contacts (ex: "Clients", "VIP").
- Template: un message type reutilisable.
- Campagne: un envoi de SMS vers un groupe de contacts.
- Credit: une unite de consommation pour envoyer des SMS.
- Service: un canal d'envoi regle par usage (marketing, notification, OTP).

## 1) Premiere connexion (workflow)
Objectif: acceder au tableau de bord.
1. Ouvrez l'ecran d'inscription, creez votre compte.
2. Connectez-vous avec votre email et mot de passe.
3. Si demande, saisissez votre code 2FA.
4. A la premiere connexion, choisissez ou creez une organisation.

Resultat: vous arrivez sur le tableau de bord.

## 2) Choisir ou creer une organisation (workflow)
Objectif: definir votre espace de travail.
1. Si vous n'avez pas d'organisation, cliquez sur "Creer".
2. Donnez un nom simple (ex: "Boutique Martin").
3. Validez.
4. Si vous avez deja une organisation, cliquez dessus pour la selectionner.

Resultat: l'organisation active est visible dans l'app.

## 3) Creer des contacts (workflow)
Objectif: ajouter des destinataires.
1. Allez dans Contacts.
2. Cliquez sur "Importer" pour charger un fichier CSV, ou sur "Ajouter" pour un contact unique.
3. Verifiez les colonnes du CSV (nom, numero, tags si disponibles).
4. Validez l'import.

Resultat: vos contacts apparaissent dans la liste.

Conseils:
- Les numeros doivent etre au format international si possible.
- Ajoutez des tags pour filtrer vos audiences.

## 4) Creer un template (workflow)
Objectif: preparer un message reutilisable.
1. Allez dans Templates.
2. Cliquez sur "Nouveau template".
3. Saisissez un nom (ex: "Promo fin de mois").
4. Ecrivez le message.
5. Choisissez une categorie (transactionnel, marketing, etc.).
6. Enregistrez.

Resultat: le template est disponible pour vos campagnes.

## 5) Lancer une campagne SMS (workflow)
Objectif: envoyer un message a un groupe de contacts.
1. Allez dans Campagnes.
2. Cliquez sur "Nouvelle campagne".
3. Donnez un nom a la campagne.
4. Choisissez vos destinataires (tous les contacts, ou un filtre par tag).
5. Choisissez un template ou saisissez un message.
6. Verifiez le nombre de destinataires et vos credits disponibles.
7. Lancez l'envoi.

Resultat: la campagne passe a "En cours", puis "Terminee".

Bonnes pratiques:
- Faites un test sur un petit groupe avant un envoi massif.
- Evitez les caracteres speciaux qui augmentent la longueur SMS.

## 6) Verifier le solde de credits (workflow)
Objectif: s'assurer que l'envoi est possible.
1. Allez dans Credits.
2. Regardez le solde actuel.
3. Consultez la consommation sur 30 jours si besoin.

Resultat: vous savez si vous pouvez envoyer une campagne.

## 7) Utiliser les outils SMS (workflow)
Objectif: verifier la longueur et les caracteres.
1. Allez dans Outils SMS.
2. Collez votre message.
3. Cliquez sur "Analyser".
4. Consultez:
   - longueur SMS
   - caracteres non GSM
   - suggestions d'optimisation

Resultat: vous obtenez une version plus courte et plus fiable.

## 8) Gerer un service de messagerie (workflow)
Objectif: definir un usage pour vos envois.
1. Allez dans Services.
2. Cliquez sur "Nouveau service".
3. Choisissez l'usage (marketing, notification, OTP, etc.).
4. Enregistrez.

Resultat: un service est associe a vos envois.

## 9) Securite du compte (workflow)
Objectif: proteger l'acces.
1. Allez dans Parametres.
2. Changez votre mot de passe si necessaire.
3. Activez la double authentification (2FA).
4. Sauvegardez vos codes de secours.

Resultat: votre compte est securise.

## 10) Depannage rapide
- Ecran vide: verifiez que vous etes connecte.
- Pas de donnees: l'API peut etre indisponible.
- Erreur de connexion: controlez l'URL API dans `.env.local`.
- 2FA perdu: utilisez un code de secours ou contactez un administrateur.

## 11) Parcours rapide (resume)
1. Creez une organisation.
2. Importez des contacts.
3. Creez un template.
4. Lancez une campagne.
5. Suivez les resultats.

---
Besoin d'aide? Indiquez l'ecran, l'action, et le message d'erreur exact pour un diagnostic rapide.
