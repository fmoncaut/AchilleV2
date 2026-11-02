# Reprise après la pause du 2 novembre 2026

Ce guide ne contient aucun secret. Les valeurs vivent dans la sauvegarde chiffrée `akwire-backup-2026-11-02`, hors dépôt, ou doivent être régénérées.

La branche `pause-2026-11` part de l'état local `fix/recette-1` (`c8b75c7`). `origin/main` (`e1c08ea`) a trois commits de plus : la fusion de la recette et le rapport de recette expurgé. Le code applicatif de cette recette est déjà dans `c8b75c7`. Avant une remise en ligne, comparer cette branche avec `origin/main` et récupérer le rapport de recette s'il doit suivre le déploiement.

## Environnement local

Deux conteneurs ont été ajoutés sans toucher `achille-postgis` (port 5433) ni la base du tableau de bord Zepros (port 5432).

| Conteneur | Image | Port hôte |
|---|---|---|
| `akwire-pause-local` | `postgis/postgis:15-3.6` | 5434 |
| `akwire-pause-mailpit` | `axllent/mailpit` | SMTP 1025, interface 8025 |

Volume : `akwire-pause-pgdata`. Base, utilisateur et mot de passe locaux : `akwire`.

Démarrer :

```powershell
docker start akwire-pause-local
docker start akwire-pause-mailpit
```

Dans le dépôt, `.env` doit pointer vers `localhost:5434`, `AUTH_URL` et `NEXT_PUBLIC_APP_URL` vers `http://localhost:3000`, et `SMTP_HOST` vers `127.0.0.1` (port 1025). Les clés Stripe de ce fichier doivent rester des clés de test (`sk_test_` / `pk_test_`). Puis :

```powershell
npm run dev
```

Arrêter : interrompre `npm run dev`, puis `docker stop akwire-pause-mailpit akwire-pause-local`. Ne pas supprimer le volume si la base locale doit être conservée.

L'interface Mailpit est `http://localhost:8025`. Aucun envoi ne doit partir vers Brevo depuis cette configuration.

Le 2 novembre 2026, `npx prisma migrate status` sur cette base indiquait : 26 migrations, schéma à jour. Ne pas lancer `prisma migrate dev`, `prisma migrate reset` ni `prisma db push` sur une base distante.

## Restaurer une sauvegarde

Les dumps sont au format custom : `staging.dump` et `prod.dump`, options `pg_dump -Fc --no-owner --no-acl`.

1. Créer un conteneur PostGIS **15** pour la staging (PostgreSQL 15.19, PostGIS 3.6) ou **18** pour la prod (PostgreSQL 18.6, PostGIS 3.6).
2. Restaurer avec un client `pg_restore` au moins aussi récent que le client qui a produit l'archive (client PostgreSQL 18 le 2 novembre 2026).
3. Commande type, vers le conteneur local :

```powershell
docker run --rm -e PGPASSWORD=akwire -v C:\Users\fabri\akwire-backup-2026-11-02\db:/dump postgres:18-alpine pg_restore -h host.docker.internal -p 5434 -U akwire -d akwire --no-owner --no-acl /dump/staging.dump
```

Des erreurs peuvent être ignorées si les comptages métier redeviennent identiques à la source : `transaction_timeout` (paramètre PostgreSQL 18), schémas `tiger` et `topology` déjà créés par l'image PostGIS, extensions `plv8` et `vector` absentes de l'image locale. L'application n'utilise pas ces deux extensions.

Vérifier avec `pg_restore -l`, puis des `SELECT count(*)` sur les tables métier, et `npx prisma migrate status`. S'il reste des migrations en attente, ne pas les appliquer sans décision explicite.

### Écart PostgreSQL 15 / 18

La staging Clever est en PostgreSQL 15.19. La production est en PostgreSQL 18.6. Les deux ont PostGIS 3.6.4. Les dossiers `prisma/migrations` de `e1c08ea`, de `49a4f6d` et de `pause-2026-11` ont le même arbre. On peut donc restaurer l'un ou l'autre dump sur le schéma du dépôt, à condition de choisir l'image du bon majeur.

| Dump | Image | Point de montage Docker |
|---|---|---|
| `staging.dump` | `postgis/postgis:15-3.6` | `/var/lib/postgresql/data` |
| `prod.dump` | `postgis/postgis:18-3.6` | `/var/lib/postgresql` |

L'image PostgreSQL 18 refuse un volume monté directement sur `/var/lib/postgresql/data`. Le client `pg_restore` reste celui de PostgreSQL 18 pour les deux archives, car elles ont été produites par ce client.

Restauration de production, vérifiée le 2 novembre 2026 sur un conteneur jetable (port 5435), puis conteneur et volume supprimés. Quatre erreurs, sans effet sur les comptages : schémas `tiger` et `topology` déjà créés, extension `vector` absente, commentaire de cette extension. `transaction_timeout` n'apparaît pas, le serveur est déjà en 18. Le dump de production ne contient pas `plv8`. 26 migrations, toutes terminées. Les comptages rejoignent ceux du rapport de pause.

La restauration de staging dans `akwire-pause-local` (port 5434) a produit sept erreurs, listées dans le rapport de contrôle : `transaction_timeout`, `tiger`, `topology`, `plv8` (création et commentaire), `vector` (création et commentaire). Aucune table, colonne, fonction, vue ou index de l'application n'utilise `plv8` ni `vector`. `to_tsvector` est la recherche plein texte de PostgreSQL, pas pgvector.

## Recréer staging, puis la production

Ordre : staging d'abord, production seulement après un health check staging. Ne pas pousser sur `main` tant que l'application ne doit pas redémarrer : Clever déploie `main` sur staging.

1. Add-on PostgreSQL **dédié payant** (pas le plan DEV : pas de PostGIS), région `par`. Staging observée : plan `xs_sml`, PostgreSQL 15, PostGIS 3.6.4, add-on nommé `akwire`. Production observée : même plan, PostgreSQL 18, PostGIS 3.6.4, add-on nommé `akwire-prod-pg`.
2. Application Node.js, région Paris. Staging : 1 scaler taille S, build dédié M. Production : 1 scaler taille M, build dédié M. Scalabilité automatique désactivée. `force-https` et zero-downtime activés, sessions collantes désactivées.
3. Lier l'add-on. `DATABASE_URL` doit être une URL `postgresql://` réelle. La console n'interpole pas `$POSTGRESQL_ADDON_URI` : le hook `clevercloud/pre-run.sh` reprend l'URI de l'add-on si besoin.
4. Variables, sans valeurs ici. Communes : `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `EMAIL_FROM`, `HOSTNAME` (`0.0.0.0`), `NODE_ENV`, `CC_NODE_VERSION` (`22`), `CC_PRE_RUN_HOOK` (`bash clevercloud/pre-run.sh`), `RESERVATION_PICKUP_HOURS`, `NEXT_PUBLIC_IGN_STYLE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_DEFAULT_FEE_RATE`, `STRIPE_NOSHOW_MODE`. Staging avait en plus `STRIPE_WEBHOOK_SECRET` et `STRIPE_WEBHOOK_SECRET_ACCOUNT`. Production avait en plus `SCALEWAY_ACCESS_KEY_ID`, `SCALEWAY_SECRET_ACCESS_KEY`, `SCALEWAY_BUCKET` (`akwire-media-prod`), `SCALEWAY_ENDPOINT`, `SCALEWAY_REGION`. Les variables `POSTGRESQL_ADDON_*` sont injectées par l'add-on.
5. `engines.node` reste `22.x`. Le hook refuse de démarrer si le majeur Node diffère de `CC_NODE_VERSION`. Il lance `prisma migrate deploy` puis `npm run build`.
6. Crons, fichier versionné `clevercloud/cron.json` : `0 2 * * *` `clevercloud/affiliation-scheduler.sh`, `0 * * * *` `clevercloud/expire-reservations.sh`.
7. Dépôt GitHub, branche `main`, pour staging. Domaine observé : `staging.akwire.fr`, plus le domaine `cleverapps.io` de chaque application. La production n'avait pas de domaine personnalisé, seulement son hôte `cleverapps.io`. `AUTH_URL` doit correspondre à l'URL publique réelle.
8. Webhooks Stripe, mode test tant que les clés sont des clés de test. Endpoints : `/api/stripe/webhook` (`STRIPE_WEBHOOK_SECRET`) et `/api/stripe/webhook/account-v2` (`STRIPE_WEBHOOK_SECRET_ACCOUNT`). Les recréer dans le Dashboard Stripe vers la nouvelle URL, puis coller les nouveaux secrets dans les variables. Ne pas réutiliser un secret d'endpoint supprimé.
9. Health check : `/api/health` doit répondre 200. Ensuite seulement, répéter pour la production.

Le DNS (GoDaddy ou autre) et les domaines Clever se règlent après la création de l'application. Ce guide ne modifie rien.

## Secrets à régénérer

Après une suppression des ressources distantes, régénérer plutôt que réutiliser :

- `AUTH_SECRET` (`openssl rand -base64 32`)
- clés Stripe secrète et publiable, plus les deux secrets de webhook
- clés Scaleway (`SCALEWAY_ACCESS_KEY_ID`, `SCALEWAY_SECRET_ACCESS_KEY`)
- clé SMTP Brevo (`SMTP_PASSWORD` / `SMTP_KEY`) et, si elle existe encore, `BREVO_API_KEY`

Les jetons locaux `CLEVER_TOKEN` et `CLEVER_SECRET` étaient dans l'ancien `.env`. Les régénérer s'ils ont pu être exposés, et ne pas les remettre dans le dépôt.

## Fusion avec origin/main

À faire après la suppression des applications Clever, pas avant : un push sur `main` redéploie staging.

`pause-2026-11` part de `c8b75c7` et ajoute ce guide. `origin/main` (`e1c08ea`) contient en plus le rapport de recette expurgé, `docs/audits/point-etape-2026-10-19.md`, la mention d'obsolescence dans `docs/status.md`, le remplacement d'un destinataire en dur dans `scripts/verify-otp-hardening.ts`, et un ajustement d'un HTML d'audit. Les migrations sont identiques.

Quand la remise en ligne sera décidée : fusionner `origin/main` dans la branche de reprise, résoudre le seul fichier en conflit probable (`docs/pause-reprise.md` n'existe pas sur `main`), puis seulement ensuite pousser `main`.

## Logos locaux

Pour afficher les enseignes sans bucket Scaleway, la base locale seule a été adaptée le 2 novembre 2026. Le code applicatif n'a pas changé : les pages utilisent `logoUrl` tel quel dans un `<img>`, et `public/` est servi à la racine.

1. Copier `media/akwire-media/` vers `public/local-logos/` (81 fichiers, dossier `merchants/`).
2. Ajouter `public/local-logos/` dans `.git/info/exclude`. Ne pas committer ces fichiers.
3. Sauver `Merchant.id` et `Merchant.logoUrl` (`db/merchant-logos-before.csv` dans la sauvegarde).
4. Remplacer le préfixe `https://akwire-media.s3.fr-par.scw.cloud/` par `/local-logos/`, en gardant le chemin de fichier. Exemple de résultat : `/local-logos/merchants/electrodepot.png`. 82 lignes passent en local, une enseigne reste sans logo. `maliterie.png` est partagé par deux enseignes.
5. Redémarrer `npm run dev` : la fiche magasin est mise en cache (`revalidate` et `unstable_cache`). Sans redémarrage, la page peut encore montrer l'ancienne URL.

Les photos produit restent chez les marchands. Seuls les logos d'enseigne sont relocalisés.

## Logos si les buckets ont été supprimés

Le 2 novembre 2026, `akwire-media` et `akwire-media-prod` contenaient chacun 81 objets, 679 555 octets, endpoint `s3.fr-par.scw.cloud`. La copie est dans `media/` de la sauvegarde.

82 enseignes ont un `logoUrl` sur `akwire-media.s3.fr-par.scw.cloud`. Les 10 550 fiches magasin n'ont pas de `logoUrl`. Recréer le bucket `akwire-media` dans `fr-par`, y renvoyer le dossier sauvegardé sous les mêmes clés d'objet, et laisser les URL publiques inchangées. Refaire de même pour `akwire-media-prod`. De nouvelles clés d'API suffisent : il n'est pas nécessaire de réécrire les `logoUrl` si le nom du bucket et la région restent les mêmes.
