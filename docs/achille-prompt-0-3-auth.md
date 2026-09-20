# Prompt Cursor — Incrément 0.3 (Auth.js)

Coller tel quel dans l'agent Cursor. Prérequis : incréments 0.1 et 0.2 livrés.

---

Contexte : suite du dépôt Achille. Respecte en permanence `.cursor/rules/achille.mdc`, `docs/project-brief.md` et `docs/data-model.md`.

Tâche : implémente UNIQUEMENT l'incrément 0.3 (Auth.js) de `docs/roadmap-increments.md`. NE crée PAS la carte, la recherche, le back-office ni d'écrans métier autres que login/compte. Arrête-toi à la fin de 0.3.

Périmètre :
- Auth.js v5 (next-auth beta, natif App Router) + @auth/prisma-adapter, branché sur le client Prisma de lib/db.ts.
- Modèles Auth.js dans schema.prisma : ajoute Account, Session, VerificationToken ; ÉTENDS le modèle User existant pour le rendre compatible adapter (ajoute emailVerified DateTime?, relations accounts Account[] et sessions Session[]) en CONSERVANT les champs métier déjà présents (lastLat, lastLng, favorites). Puis migre (prisma migrate dev). Aucun mot de passe applicatif.
- Providers, activés CONDITIONNELLEMENT selon les variables d'env présentes (l'app doit démarrer même si aucune n'est configurée) :
    * Google  → seulement si GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET présents.
    * Apple   → seulement si les variables APPLE_* présentes.
    * Email (lien magique) → via Nodemailer/SMTP depuis l'env ; EN DEV, si aucun SMTP n'est configuré, surcharge sendVerificationRequest pour LOGGER le lien magique dans la console (pas d'envoi réel). SMTP prévu pour Brevo plus tard.
- Config : auth.ts (config centrale, export auth/handlers/signIn/signOut), app/api/auth/[...nextauth]/route.ts, et un middleware.ts qui protège UNIQUEMENT /compte (et prépare /admin) — le reste du site reste public.
- Écrans : page de connexion (login) sobre aux couleurs Achille ; page /compte minimale affichant l'utilisateur connecté + déconnexion. Bouton/lien « continuer sans compte » qui renvoie vers l'accueil public.
- .env.example : AUTH_SECRET, AUTH_URL (ou NEXTAUTH_URL selon la version), et les variables Google / Apple / SMTP, toutes SANS valeurs.

Contraintes (rappel) : aucun secret en dur (.env only) ; identité gérée entièrement par Auth.js ; navigation publique autorisée sans compte ; aucune dépendance Google Maps/Places (il s'agit ici d'OAuth, pas de cartographie).

Critères d'acceptation (à vérifier avant de t'arrêter) :
1. Adapter Prisma en place ; Account/Session/VerificationToken créés et migrés ; User compatible adapter tout en gardant lastLat/lastLng/favorites.
2. Connexion fonctionnelle : par e-mail (lien magique loggé en console en dev), et par Google si ses variables sont configurées ; session persistée en base.
3. /compte est protégée (redirige vers login si non connecté) ; la navigation publique fonctionne sans compte (« continuer sans compte » opérationnel).
4. npm run build et npm run lint passent ; aucun secret dans le dépôt ; aucun mot de passe applicatif stocké ; .env.example à jour.

Quand c'est fait : liste les fichiers créés/modifiés, confirme les 4 critères, et rappelle où renseigner les identifiants Google/Apple/SMTP quand ils seront prêts. N'enchaîne pas sur 0.4.
