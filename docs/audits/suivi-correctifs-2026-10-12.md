# Suivi des correctifs — 12 octobre 2026

Suite de l’audit navigateur staging : `docs/audits/audit-navigateur-staging-2026-10-12.pdf`.

Les changements sont **en local uniquement**. Rien n’a été commité, rien n’a été déployé sur staging. Aucune empreinte Stripe n’a été envoyée, aucun compte n’a été supprimé.

## Fait aujourd’hui

| Id | Sujet | Où | Vérification |
| --- | --- | --- | --- |
| C1 | Favori magasin UUID accepté, message si l’action échoue | `lib/favorites.ts`, `components/favorite-button.tsx` | Script : création puis retrait d’un favori sur un POS dont l’id contient des tirets. Compte jetable, supprimé ensuite. |
| C2 | La fiche reprend le lieu, trie par distance, garde le `pos` demandé, affiche les km | liens d’offres, `components/catalog/query.ts`, tiroir carte | Navigateur : crochet Electro Depot depuis Paris → Bagnolet en tête, 4,7 km. |
| C3 | `/confidentialite` décrit affiliation et retrait (empreinte, débit au retrait). Plus de bandeau placeholder sur cette page. Contact : `support@akwire.fr` | `app/confidentialite/page.tsx` | Page lue dans le navigateur. Le SIREN et la raison sociale restent à publier dans les mentions. |
| C4 | Quantité au-dessus du stock : « Il reste N en magasin », valeur ramenée au stock | `components/reserve-button.tsx`, `components/reservation/cart-quantity-form.tsx`, `lib/reservations/cart.ts` | Panier E2E, stock 8, saisie 9 : message, quantité revenue à 8. |
| C5 | Un lieu non reconnu n’entre plus dans le titre | `app/recherche/page.tsx` | `/recherche?lieu=zzzznotacity` : H1 « Bonnes affaires près de chez toi », message « Lieu introuvable ». |
| C6 | Pas de réservation si l’enseigne n’encaisse pas | fiche, cartes, `addOfferToCart` | Electro Depot Fréjus : bouton désactivé, texte avant l’ajout. E2E Lyon (encaissement actif) : ajout au panier, puis panier vidé. |
| D7 | Bouton Annuler sur le conflit de panier | `components/reserve-button.tsx` | Présent dans l’interface. Le dialogue n’a pas été rejoué au clic dans cette session. |
| Carte | Marqueurs limités aux POS qui ont au moins une offre. Style Plan IGN public si aucune URL de tuiles n’est définie | `lib/geo.ts` (`pinsWithOffers`), `components/map/offers-map.tsx`, `lib/map-config.ts` | Paris, 20 km : 5 marqueurs, fond IGN, tiroir Bagnolet avec des offres. |

Contrôle rejouable : `node --env-file=.env --import tsx scripts/verify-audit-fixes.ts`.

## Affiliation et direct

- Affiliation : `GET /api/out/…?pos=…` → **302** vers le marchand, cookie `anonId` posé. Pas de suivi jusqu’au paiement marchand.
- Direct : offre E2E POS Lyon ajoutée au panier (distance affichée), ligne retirée ensuite. Pas d’empreinte.

## À reprendre

1. Déployer ces correctifs sur staging et refaire le passage navigateur là-bas (le PDF décrit staging *avant* ces changements).
2. D8 — bouton « Effacer les filtres » quand un filtre est actif.
3. Recette paiement test sur un magasin qui encaisse (carte test, refus, code de retrait). Pas commencée.
4. Mettre à jour `docs/prompts/00-5-audit test navigateur.md` avec les décisions D1–D6 et D9–D12 du PDF, pour que le prochain audit ne rejoue plus le scan, le push, Facebook ni le mot de passe.
5. Compléter les mentions légales (raison sociale, SIREN, directeur de la publication). La confidentialité renvoie encore vers elles pour l’identité de l’éditeur.
