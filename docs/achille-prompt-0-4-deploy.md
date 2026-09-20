# Prompt Cursor — Incrément 0.4 (Déploiement Clever Cloud + CI) — clôture Phase 0

Coller tel quel dans l'agent Cursor. Prérequis : incréments 0.1 → 0.3 livrés.
Prérequis externes pour un déploiement réellement live : vrai dépôt GitHub + compte Clever Cloud avec add-on PostgreSQL sur un PLAN DÉDIÉ PAYANT (le plan DEV gratuit n'autorise PAS les extensions, donc pas de PostGIS).

---

Contexte : suite du dépôt Achille. Respecte en permanence `.cursor/rules/achille.mdc` et `docs/data-model.md`. Clôture de la Phase 0.

Tâche : implémente UNIQUEMENT l'incrément 0.4 (Déploiement Clever Cloud + CI) de `docs/roadmap-increments.md`. NE crée PAS d'écrans métier. Arrête-toi à la fin de 0.4.

Important sur la cible : le déploiement se fait via l'INTÉGRATION GITHUB NATIVE de Clever Cloud (push sur main → build & deploy). N'utilise PAS d'OIDC ni de clés cloud dans le dépôt ou dans GitHub Actions. Les Actions ne servent qu'au CI (aucun secret cloud).

Périmètre :
- Préparer Next.js pour la prod : next.config avec output: 'standalone' ; une route de health check app/api/health/route.ts renvoyant 200 (statut + horodatage) ; s'assurer que les secrets sont lus côté serveur uniquement.
- Migrations au déploiement : configure un deploy hook Clever Cloud lançant `npx prisma migrate deploy` à chaque déploiement (fichier de hook dans clevercloud/ ou variable CC dédiée), documenté clairement. NE lance PAS de migrate dev en prod.
- CI GitHub Actions : .github/workflows/ci.yml déclenché sur push et pull_request → install, lint, typecheck (tsc --noEmit), prisma validate, build. Aucun secret cloud.
- Documentation : docs/deployment.md décrivant les ÉTAPES MANUELLES exactes côté plateforme (créer l'app Node/Next sur Clever Cloud ; ajouter l'add-on PostgreSQL sur un PLAN DÉDIÉ PAYANT — préciser explicitement que le plan DEV gratuit n'autorise pas les extensions et ne permet donc pas PostGIS ; PostGIS étant une extension par défaut sur Clever Cloud, elle sera créée automatiquement par la migration Prisma via `CREATE EXTENSION IF NOT EXISTS postgis;` au premier `migrate deploy`, aucune action manuelle nécessaire ; connecter le dépôt GitHub pour l'auto-déploiement ; renseigner les variables d'env de prod dans la console Clever Cloud : DATABASE_URL, AUTH_SECRET, AUTH_URL, et les variables OAuth/SMTP si utilisées ; vérifier que le hook migrate deploy s'exécute). Précise la commande de run.
- .env.example : complété pour la prod si nécessaire (sans valeurs).

Contraintes (rappel) : aucun secret en dur ni dans les workflows ; données en UE ; pas de dépendance Google Maps/Places.

Critères d'acceptation (à vérifier avant de t'arrêter) :
1. next.config en standalone ; /api/health renvoie 200 ; npm run build passe.
2. Le workflow CI exécute lint + typecheck + prisma validate + build sur les PR, SANS aucun secret cloud.
3. Le deploy hook est configuré pour exécuter `prisma migrate deploy` au déploiement, et c'est documenté.
4. docs/deployment.md liste les étapes manuelles (app Clever Cloud, add-on PostgreSQL sur plan dédié payant — pas DEV — avec PostGIS créé par la migration, intégration GitHub, variables d'env) ; aucun secret dans le dépôt.

Quand c'est fait : liste les fichiers créés/modifiés, confirme les 4 critères, et résume en 4–5 lignes les actions manuelles qui me restent à faire sur Clever Cloud et GitHub pour rendre le déploiement effectif. Fin de la Phase 0.
