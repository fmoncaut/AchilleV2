# Achille — où on en est

**Date :** 20 septembre 2026  
**Phase en cours :** Phase 1 **terminée** (affiliation).  
**Prochaine étape :** Phase 2 « Directe » — **ne pas commencer** tant que ce n’est pas demandé.

Copie de sauvegarde : `https://github.com/fmoncaut/AchilleV2` (`main`, commit `1.5 favoris + PWA + durcissement`).

---

## Ce qui est livré

| Incrément | Contenu | Statut |
| --- | --- | --- |
| 0.1 | Next.js App Router, Tailwind, tokens navy/orange | Fait |
| 0.2 | Prisma + PostGIS, seed, `lib/geo.ts` | Fait |
| 0.3 | Auth.js (e-mail magique, Google/Apple optionnels), `/login`, `/compte` | Fait |
| 0.4 | CI GitHub + déploiement Clever Cloud | Fait |
| 1.1 | Back-office `/admin` (CRUD offres, CSV, isolation enseigne) | Fait |
| 1.2 | Recherche + carte MapLibre / tuiles IGN (pas de Google Maps) | Fait |
| 1.3 | Vitrine SEO : `/offre`, `/magasin`, `/[ville]/[categorie]`, sitemap | Fait |
| 1.4 | CTA marchand, `/api/out/[offerId]`, cookie `anonId`, dashboard `/admin/renvois` | Fait |
| 1.5 | Favoris, PWA, bandeau cookies, pages légales, analytics opt-in, `docs/security-review.md` | Fait |

**Métier Phase 1 :** Achille montre l’offre locale et **redirige** vers le site du marchand. On track le renvoi (`OfferClick`). **Pas de panier, pas de paiement, pas de checkout.**

---

## Parcours à tester en local

```bash
npm run dev
```

- Accueil → recherche (ville + rayon, liste/carte IGN)
- Fiche offre → « Voir l’offre chez le marchand » → `OfferClick` puis 302
- Fiche magasin, pages ville/catégorie
- Compte (lien magique) → favoris produits / magasins
- `/admin` (après `npx tsx scripts/promote-merchant.ts vous@exemple.fr bricomarche`) : offres, CSV, renvois
- PWA : `/manifest.webmanifest`, `/sw.js` (ne met pas en cache `/api/out`)

Qualité : `npm run lint`, `npx tsc --noEmit`, `npm run build` passaient à la clôture 1.5.

---

## Avant une mise en ligne réelle

1. Remplir les **placeholders** `/mentions-legales`, `/confidentialite`, `/cgu` (éditeur, SIREN, DPO).
2. Variables prod : `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` / `NEXT_PUBLIC_APP_URL`, SMTP Brevo, tuiles IGN.
3. Analytics UE **optionnelle** : `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (sinon rien n’est envoyé). Alternative Matomo : `NEXT_PUBLIC_MATOMO_URL` + `NEXT_PUBLIC_MATOMO_SITE_ID`.
4. Deep-links `merchantUrl` du seed : URLs de démo (peuvent 404 chez le marchand) — à remplacer par de vrais liens.
5. Relire `docs/security-review.md`.

---

## Ce qu’on ne code pas encore (Phase 2+)

- **Directe :** panier mono-magasin, paiement, click-and-collect, QR / code acheteur, commandes.
- **Mobile natif** (la PWA de 1.5 est le palier web).
- Favoris plus riches, onboarding catégories Figma complet, lookup « prix marché » EAN lourd.

Règles inchangées : `.cursor/rules/achille.mdc`, `docs/project-brief.md`, `docs/data-model.md`.

---

## Reprise

Pour continuer l’affiliation (correctifs, recette, prod) : rester sur `main`, Phase 1.  
Pour la Phase 2 : nouvel incrément explicite, **sans** le démarrer par défaut.
