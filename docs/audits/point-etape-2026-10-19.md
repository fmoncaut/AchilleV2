# Point d'étape — refonte Akwire, 19 octobre 2026

Reprise prévue en fin de semaine. Ce document dit où on en est, ce qui reste à faire et dans
quel ordre. Le brief de la refonte reste `docs/prompts/00-6-refonte-design-ux.md`.

## En une phrase

La refonte (Vagues 0 à 6), les correctifs trouvés en recette et le chantier de performance sont
**dans `main` et sur staging**. La **prod n'a encore rien reçu**. Décision de Fabrice : on reste
sur staging jusqu'à la fin de la recette et la validation du design.

## État des environnements

| Environnement | Version | Remarque |
| --- | --- | --- |
| `main` | `3d2edaa` (PR #28) | Tout le code prévu avant l'ouverture. |
| Staging | `main` | Node 22, crons horaires et nocturnes vérifiés. |
| Prod (soft-launch) | ancienne version | Probablement en Node 24 avec des crons cassés, comme staging l'était. Rien n'a été déployé. |

## Ce qui est fait

| PR | Contenu |
| --- | --- |
| #4 | Vague 0 : design system (tokens Encre / Ambre / Crème, Space Grotesk, primitives, états de chargement et d'erreur) |
| #5 | Correctifs de l'audit du 12/10 (C1 à C6, D7), pages légales, scripts de capture |
| #6 | Node 22 épinglé, garde de version dans `pre-run.sh`, build limité à 15 min |
| #7 | Vague 1 : header, footer, focus, vouvoiement, gabarit d'e-mail |
| #8 à #11 | Vague 2 : carte d'offre unique, accueil et recherche, carte et pins, fiches |
| #12 | Vague 3 : connexion OTP (champ unique conservé), onboarding (5 intérêts max) |
| #13, #16 | Scripts `verify-payments`, `verify-home-feed`, `verify-reservations` remis au vert, avec un garde « base locale `*_jetable` » |
| #14 | « Ouvert maintenant » : lecture du vrai format d'horaires, à l'heure de Paris |
| #15 | Vague 4 : tunnel Click & Collect, apparence Stripe, « Continuer vers l'empreinte bancaire » |
| #17 | Vague 5 : espace compte, statuts de réservation en couleur et en texte |
| #18 | Plus de page d'erreur après la suppression de compte |
| #19, #20, #22 | Vague 6 : socle admin, espace marchand (comptoir), superadmin |
| #21 | Plus de « NEXT_REDIRECT » après création ou modification de magasin |
| #23 | Le bouton « No-show » du marchand ne renvoie plus d'erreur |
| #24 | E-mail « Réservation confirmée » (envoyé une fois, transactionnel) |
| #25 | « Ouvert maintenant » masqué sans horaires connus ; « Distance » balisé indisponible |
| #26 | Carte chargée en différé sur mobile |
| #27 | Police d'icônes réduite de 3,8 Mo à 9 Ko (43 icônes, `npm run verify-icons`) |
| #28 | Corrections de la recette 1 : visibilité des magasins, tableaux admin à 390 px, stepper en 3 étapes, initiales d'enseigne, favori à 44 px |

**Performance mobile (Lighthouse, 4G simulée)** : LCP d'environ 23-25 s (prod) à environ 4 s
(staging) sur l'accueil, la recherche et la fiche offre. Accessibilité : 100 / 100 / 100.

## Recette de staging

Détail : `docs/audits/recette-staging-2026-10-19.md`. Les captures sont dans `screenshots/`
(non versionné).

**Passage 1** : 25 OK, 8 KO, 7 non testés. Les KO de code sont corrigés par la #28. Les autres :
« Distance » (désactivé, dispensé de contraste), Stripe Link (décision Fabrice), compte marchand
mal rattaché (refait au passage 2).

**Passage 2, en pause.** Déjà vérifié sur staging :

- les 5 corrections de la #28 ;
- le compte marchand de test rattaché à l'enseigne **E2E Stripe** (ligne « Vendeur · E2E Stripe ») ;
- l'onboarding de l'acheteur 2 (« 5 sur 5 », CGU, alertes décochées).

**Reste à faire, dans cet ordre :**

1. Empreinte de l'acheteur 2 : saisir la carte **à la main** (« Modifier le moyen de paiement »,
   puis `4242 4242 4242 4242`, `12/34`, `123`), pas via Link. Si le panier a expiré entre-temps,
   repartir de la fiche E2E. Vérifier qu'un seul e-mail « Réservation confirmée » arrive.
2. Marchand : Confirmer → Prête → comptoir à 768 px (code faux, puis bon code avec espaces et
   minuscules) → Retirée → facture (acheteur et admin, impression).
3. Marchand : offre (créer, modifier, supprimer), import CSV d'une ligne, magasin de test (créer
   via suggestion d'adresse, modifier sans « NEXT_REDIRECT », puis fermer).
4. Tous les écrans à 1 440 px, l'anneau de focus au clavier, et les pins gris si la zone en montre.
5. Fin : remettre le compte marchand de test en acheteur. Garder l'acheteur 2.

Le no-show est couvert par `verify-reservations` : pas de test manuel.

## Décisions en attente (Fabrice)

| Sujet | Recommandation |
| --- | --- |
| **Stripe Link** | Le désactiver (test puis live) : il propose la carte enregistrée du navigateur, même quand un autre compte Akwire est connecté. |
| **Moyens de paiement en live** | Cartes seulement (Apple Pay et Google Pay inclus), plus le domaine de prod dans « Domaines des moyens de paiement ». |
| **`STRIPE_NOSHOW_MODE` en prod** | Vérifier la valeur. Si `partial`, les CGU doivent annoncer la pénalité. |
| **CGU** | Relecture juridique (le fichier porte « À faire relire avant prod »). |
| **Mentions légales** | Raison sociale, SIREN, directeur de la publication. |
| **Validation du design** | Sur staging ou sur les captures 390 / 1 440 px, après le passage 2. |
| **E-mail « Réservation confirmée »** | Envoyé même si l'acheteur a coupé le suivi de commande (transactionnel). Une ligne à changer si tu préfères l'inverse. |

## Mise en prod (le moment venu)

1. Vérifier le commit en prod : `clever activity --alias prod`. Aucune migration Prisma depuis le
   9 octobre ; s'il est plus ancien, `prisma migrate deploy` s'appliquera au démarrage (prévu
   dans `pre-run.sh`).
2. Déployer `main` sur l'application prod.
3. Logs de démarrage : « Starting with Node.js v22 », pas de « Node majeur … » (sinon le
   déploiement s'arrête et l'ancienne version reste en ligne), migrations, build.
4. Au premier cron horaire : `clever logs --alias prod | grep CMDOUT` doit montrer
   `expire_reservations_done`. Ce passage peut traiter d'un coup les réservations échues depuis
   le 13 octobre : noter le nombre `treated`.
5. Test rapide : accueil, une fiche, connexion. Pas d'empreinte réelle si Stripe est en live.

## Après l'ouverture

- Image principale des fiches : photo marchand servie en pleine taille (LCP mobile de la fiche).
  Redimensionner (domaines `next/image` ou miniatures à l'import).
- Horaires des magasins : `scripts/import-pos.ts` n'en importe aucun. À importer, ou à faire
  saisir par les marchands. « Ouvert maintenant » et le badge Ouvert/Fermé des fiches en dépendent.
- Garde « base `*_jetable` » sur les scripts qui n'en ont pas encore : `verify-us5-detail-hub`,
  `verify-us6a-settings`, `verify-us6b-deletion`, `verify-tenant-isolation`,
  `verify-admin-pos-geo`, `verify-affiliation`, `verify-affiliation-feed`,
  `verify-affiliation-http`.
- Les scripts tentent d'envoyer de vrais e-mails avec le SMTP du `.env` local.
- `.env` local : il pointe vers un Postgres Clever non identifié. Le faire pointer vers la base
  Docker locale.
- `.gitattributes` pour fixer les fins de ligne (plusieurs fichiers mélangent LF et CRLF).
- Flux d'affiliation de staging sans URL source (`SKIPPED_NO_SOURCE` chaque nuit) : voulu ?
- Pins : le texte visible (initiales, compteur) n'est pas dans le nom accessible.
- Avertissement Prisma : `package.json#prisma` à migrer vers `prisma.config.ts` avant Prisma 7.
- `OtpInput` (`components/ui/`) n'est pas utilisé (il casse le remplissage automatique).
- Le dépôt GitHub est **public** : ne jamais y mettre d'adresse, de capture ni d'export contenant
  des données personnelles. Les captures restent dans `screenshots/` (ignoré par git).

## Mémo technique

- **Base locale** : PostGIS Docker `achille-postgis` sur `localhost:5433`. Pour un test, créer une
  base neuve nommée `*_jetable` (`migrate deploy`, puis seed), et la supprimer après.
- **Tests qui écrivent** : ne jamais les lancer avec le `.env` du poste ; passer `DATABASE_URL`
  explicitement.
- **Pull requests** : l'environnement de Cursor ne joint pas `api.github.com`. Cursor pousse la
  branche, la PR est ouverte avec `gh` depuis un autre poste ou session.
- **Images** : `next.config.ts` n'autorise aucun domaine distant. Garder `<img>` pour les logos
  et les photos marchands.
- **Icônes** : nouvelle icône = l'ajouter à `app/fonts/material-symbols-icons.txt` et régénérer le
  sous-ensemble (voir `components/ui/README.md`).
- **Comptes de test** : alias Gmail du propriétaire (`+acheteur2`, `+marchand`). Ne pas écrire
  les adresses dans le dépôt.

## Message de reprise pour Cursor

```
Avant tout : ta copie locale NON SUIVIE de docs/audits/recette-staging-2026-10-19.md est
désormais versionnée dans main (adresses e-mail retirées). Supprime ta copie locale, puis
git checkout main && git pull, sinon git refusera d'écraser le fichier.

Reprise de la recette staging, passage 2 (voir docs/audits/point-etape-2026-10-19.md, section
« Recette de staging », liste « Reste à faire »). Même protocole : pas de code, Fabrice donne
les codes OTP et saisit la carte À LA MAIN (pas via Link). Complète
docs/audits/recette-staging-2026-10-19.md, section « Passage 2 », sans écrire d'adresse e-mail
(le dépôt est public : utilise « alias acheteur 2 », « alias marchand »).
Résumé OK / KO / non testés, puis la liste des KO. Ne corrige rien.
```
