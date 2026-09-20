# Déploiement Achille (Clever Cloud)

Phase 0 — incrément 0.4. Le code se déploie via **l’intégration GitHub native** de Clever Cloud (push sur `main` → build & run). GitHub Actions ne fait **que** du CI (lint, typecheck, Prisma, build). **Aucun secret cloud**, **pas d’OIDC**, **pas de clé Clever Cloud** dans le dépôt ni dans les workflows.

Région : **Paris (par)** — données en UE.

---

## 1. Créer l’application Node.js

Dans la [console Clever Cloud](https://console.clever-cloud.com/) :

1. **Create** → **an application** → **Node.js**.
2. Nom : `achille` (ou équivalent). Zone : **Paris (par)**.
3. Taille d’instance : **S** (ou plus) pour le run. Pour le **build Next.js**, passer le *build flavor* à **M** (Scalability / build instance) — un build Next.js manque souvent de mémoire en XS.
4. Version Node : **22** (`CC_NODE_VERSION=22`).

Clever Cloud installe les dépendances puis exécute `npm run build` si le script existe, puis lance `npm start`.

## 2. Add-on PostgreSQL — plan dédié payant (obligatoire)

1. **Create** → **an add-on** → **PostgreSQL**.
2. Choisir un **plan dédié payant** (XS, S, M, …).  
   **Ne pas prendre le plan DEV (gratuit)** : il **n’autorise pas les extensions PostgreSQL**, donc **pas de PostGIS**, donc Achille ne peut pas fonctionner (colonne `geog`, index GiST).
3. Zone **Paris (par)**. Lier l’add-on à l’application `achille`.

PostGIS est une **extension par défaut** sur les plans dédiés Clever Cloud. **Aucune action manuelle** dans `psql` : la première migration Prisma contient `CREATE EXTENSION IF NOT EXISTS postgis;` et l’exécute au premier `prisma migrate deploy`.

L’add-on injecte notamment `POSTGRESQL_ADDON_URI`. Prisma lit **`DATABASE_URL`** : dans les variables de l’app, définir :

```
DATABASE_URL=$POSTGRESQL_ADDON_URI
```

(Clever Cloud interpole la variable de l’add-on.)

## 3. Connecter le dépôt GitHub (auto-déploiement)

1. Dans l’application → **Information** / **Git** → lier le **dépôt GitHub** Achille (installer l’application GitHub Clever Cloud si besoin).
2. Branche de déploiement : **`main`**.
3. Activer le déploiement automatique : **un push sur `main` déclenche build & deploy**.

Ne pas ajouter de token Clever Cloud, de clé SSH cloud, ni d’OIDC dans GitHub Actions.

## 4. Variables d’environnement (console Clever Cloud)

À renseigner **dans la console**, jamais dans le dépôt.

| Variable | Obligatoire | Rôle |
|---|---|---|
| `DATABASE_URL` | oui | `$POSTGRESQL_ADDON_URI` (Prisma) |
| `AUTH_SECRET` | oui | secret Auth.js (ex. `openssl rand -base64 32`) |
| `AUTH_URL` | oui | URL publique HTTPS de l’app, ex. `https://achille.cleverapps.io` |
| `CC_PRE_RUN_HOOK` | oui | `bash clevercloud/pre-run.sh` |
| `CC_NODE_VERSION` | recommandé | `22` |
| `NODE_ENV` | recommandé | `production` |
| `HOSTNAME` | oui | `0.0.0.0` (écoute sur l’instance, bundle standalone) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | non | OAuth Google |
| `APPLE_ID` / `APPLE_SECRET` | non | Sign in with Apple |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `EMAIL_FROM` | non | e-mail (Brevo) |
| `NEXT_PUBLIC_APP_URL` | non | URL publique, si besoin côté client |

Redirect OAuth (quand Google/Apple seront branchés) : `<AUTH_URL>/api/auth/callback/google` et `…/callback/apple`.

## 5. Hook de migration (pas de `migrate dev` en prod)

Le fichier versionné `clevercloud/pre-run.sh` exécute **uniquement** :

```bash
npx prisma migrate deploy
```

Dans la console, variable :

```
CC_PRE_RUN_HOOK=bash clevercloud/pre-run.sh
```

Ce hook tourne **avant chaque démarrage**, après le build. S’il échoue, le déploiement échoue. **Ne jamais** lancer `prisma migrate dev` en production.

Le CLI Prisma est en `dependencies` (pas seulement `devDependencies`) pour rester disponible alors que Clever Cloud ignore les devDependencies au run par défaut (`CC_NODE_DEV_DEPENDENCIES=ignore`).

Après le premier déploiement, vérifier les **logs** : une ligne du type « N migration(s) found » / « applied » confirme le hook.

## 6. Commande de run

Clever Cloud lance par défaut **`npm start`**. Avec `output: "standalone"`, Next.js 16 n’utilise **pas** `next start` : le script `start` exécute :

```
node .next/standalone/server.js
```

Le script `postbuild` copie `.next/static` (et `public` s’il existe) dans le bundle standalone. Next.js écoute le port injecté (`PORT`).

Variables **obligatoires** pour que le process écoute sur l’instance :

```
HOSTNAME=0.0.0.0
```

Surcharge possible (inutile si `npm start` est inchangé) :

```
CC_RUN_COMMAND=node .next/standalone/server.js
```

Health check (optionnel dans la console) : chemin **`/api/health`** (JSON `{ status, timestamp }`, HTTP 200).

## 7. CI GitHub Actions

Le workflow `.github/workflows/ci.yml` s’exécute sur **push** et **pull_request** : `npm ci`, lint, `tsc --noEmit`, `prisma validate`, `npm run build`. Aucun secret d’hébergeur. Le déploiement n’est **pas** dans Actions.

## 8. Checklist premier go-live

1. App Node.js Paris + build flavor M.
2. PostgreSQL **dédié payant** (pas DEV), lié, `DATABASE_URL=$POSTGRESQL_ADDON_URI`.
3. `AUTH_SECRET`, `AUTH_URL`, `HOSTNAME=0.0.0.0`, `CC_PRE_RUN_HOOK=bash clevercloud/pre-run.sh`.
4. Dépôt GitHub connecté, branche `main`, auto-deploy.
5. Push sur `main` → CI verte → deploy Clever Cloud.
6. Logs : `prisma migrate deploy` OK (PostGIS créé par la migration).
7. `https://<app>/api/health` → 200.
