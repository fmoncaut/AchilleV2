# Tracking d’affiliation (incrément 1.4)

Achille **redirige** vers le site du marchand ; il ne vend pas (pas de panier, pas de paiement).

## Flux

1. Le CTA « Voir l’offre chez le marchand » pointe vers `GET /api/out/[offerId]`.
2. L’endpoint charge l’offre : **404** si absente, hors ligne (`isOnline=false`) ou sans `merchantUrl`.
3. `merchantUrl` doit être une URL **http(s) absolue** : sinon **400**.
4. Un `OfferClick` est enregistré **avant** la redirection (sauf anti-doublon).
5. Réponse **302** vers `offer.merchantUrl`.

Champs `OfferClick` (minimisation, pas de PII superflue) :

| Champ | Contenu |
| --- | --- |
| `offerId` | Offre cliquée |
| `userId` | Identifiant Auth.js si connecté, sinon `null` |
| `sessionId` | Cookie `anonId` (UUID opaque) |
| `referrer` | Origine + chemin du `Referer`, **sans query string** |
| `createdAt` | Horodatage |

Pas d’IP, pas de user-agent, pas d’e-mail, pas de nom.

## Cookie `anonId`

- Posé s’il est absent, sur les réponses de `/api/out/[offerId]` (y compris 400/404).
- `httpOnly`, `SameSite=Lax`, `Path=/`, durée ~1 an, `Secure` en production.
- Sert uniquement à attribuer les clics anonymes. Déclaré dans le bandeau de consentement et la politique de confidentialité (incrément 1.5).

## Anti-abus léger

Fenêtre de **60 secondes** : un second GET vers la **même offre** avec le même `anonId` (ou le même `userId` connecté) n’insère pas de nouvel `OfferClick`. La redirection 302 a lieu quand même (rechargement immédiat, double-clic). Ce n’est pas un anti-fraude avancé.

## Tableau de bord

`/admin/renvois` : totaux par jour, par enseigne et par offre, période 7 ou 30 jours. Un **MERCHANT** ne voit que les clics de son enseigne ; un **ADMIN** voit tout. Agrégations SQL `GROUP BY` (pas de N+1).
