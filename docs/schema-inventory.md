# Inventaire schéma Prisma (état des lieux)

Document de décision pour la suite transactionnelle.  
Source de vérité runtime : [`prisma/schema.prisma`](../prisma/schema.prisma).  
Migrations clés : `20260922*` (réservations / panier / Stripe), `20260925*` (messages), `20260929*` (macros / profil).

[`docs/data-model.md`](data-model.md) est **périmé** (note « phase directe : ne pas créer Order/Pickup » alors que `Reservation*` + Stripe existent ; pas de macros). Ne plus s’y fier pour le schéma actuel.

---

## 1. Verdicts bloquants

### `condition` vit sur **Offer**, pas sur Product

- Enum `ProductCondition` : `NEUF | OCCASION | RECONDITIONNE` (dès `20260920134952_init_postgis`).
- Champ `Offer.condition` `@default(NEUF)`.
- **`Product` n’a ni `condition` ni `sku`** (seulement `ean?`).

La condition varie par canal / magasin : affiliation (parseur) et direct (saisie marchand) écrivent sur `Offer.condition`. **Pas** de migration pour déplacer condition vers Product.

### Le volet transactionnel click & collect est **déjà en schéma**

Les migrations « réservations / Stripe Connect hold / messagerie » portent un tunnel C&C mono-magasin complet. Avant d’ajouter Order/Payment génériques, partir de cet existant.

```
ReservationCart --confirm+empreinte--> Reservation
                                      ├─ ReservationItem (→ Offer)
                                      ├─ Message (acheteur ↔ enseigne)
                                      ├─ paymentIntentId / paymentState
                                      └─ pickupCode (QR dérivé côté app)
Merchant.stripeAccountId / feeRate ──┘
```

---

## 2. Couverture migrations transactionnelles

| Migration | Ce qu’elle pose |
| --- | --- |
| `20260922140000_reservations` | `Reservation` + `ReservationItem` ; statuts `PENDING` → `CONFIRMED` → `READY_FOR_PICKUP` → `PICKED_UP` (+ `CANCELLED`, `NO_SHOW`, `EXPIRED`) ; rattache `User` / `Pos` / `Merchant` ; lignes → `Offer` ; `totalAmount`, `commissionAmount`, `feeAmount` ; `pickupCode` unique + `pickupDeadline` + horodatages. **Pas encore de paiement** à ce stade. |
| `20260922180000_reservation_cart` | `ReservationCart` / `ReservationCartItem` : panier pré-confirmation, mono-magasin, sans paiement ; proprio `userId` **ou** `sessionKey`. |
| `20260922190000_stripe_connect_hold` | `Merchant` : `stripeAccountId`, `chargesEnabled`, `payoutsEnabled`, `detailsSubmitted`, `feeRate`. `Reservation` : `paymentIntentId`, `paymentState` (`NONE` → `REQUIRES_ACTION` → `AUTHORIZED` → `CAPTURED` / `CANCELED`). `ProcessedStripeEvent`. |
| `20260925140000_reservation_messages` | `Message` : fil acheteur ↔ enseigne **uniquement** sur une `Reservation`. |

**Absent** (ne pas confondre avec « à créer pour C&C ») :

- Pas de modèles `Order` / `Payment` / `Pickup` séparés — domaine C&C = `Reservation*`.
- Pas d’adresse de livraison sur la réservation (retrait = adresse du `Pos`).
- Pas de colonne QR — QR dérivé de `pickupCode` (`lib/reservations/pickup-qr.ts`).
- Pas de moyen de paiement stocké sur `User`.

Métier : [`docs/reservations.md`](reservations.md).

---

## 3. Inventaire par zone (post-alignement macros)

### User / auth

- Champs : `email?`, `emailVerified?`, `name?`, `image?`, `lastLat` / `lastLng?`, `role`, `merchantId?`.
- Auth.js : `Account`, `Session`, `VerificationToken` — magic-link + Google/Apple optionnels, **pas** de password.
- Ajouté (`20260929120000_align_interest_profile`) : `UserAddress`, `UserInterest`, `NotificationPreference` (`ORDER_UPDATES` / `DEAL_ALERTS`, toggles email/push, index partiels SQL).
- Absent : token push FCM, cartes enregistrées.

### Catalog / vitrine

- `Product` : identité catalogue — **pas** condition, **pas** sku.
- `Offer` : cœur métier (prix, stock, **`condition`**, kind, scope, feed…).
- `Category` : arbre + `icon?`, `displayOrder`, `legacyCategoryCode`, `macroId?` (héritage : `lib/categories/resolve-macro.ts`).
- `InterestCategory` : 12 macros M01…M12 — voir [`docs/mapping-macro-categories.md`](mapping-macro-categories.md).
- `Favorite` : `userId` + `productId?` / `posId?` (sans FK Prisma vers Product/Pos).
- `Pos.openingHours` `Json?` : **présent**.
- `Pos.merchantClosedAt` `DateTime?` : fermeture douce marchand (A.3.5) — hors vitrine si non-null, quel que soit `status`.

### Affiliation

- `Broker`, `AffiliationProfile` / `Feed` / `ImportLine`, `AffiliationCategoryMapping`, `OfferClick`, `OfferPos`.

---

## 4. Implications pour la suite

1. **Ne pas** ajouter `Product.condition` — brancher parseur affiliation + écrans direct sur `Offer.condition`.
2. **Ne pas** repartir d’un Order/Cart générique pour le C&C : consommer / étendre `Reservation` / `ReservationCart` / Stripe hold.
3. Profil acheteur (adresses, intérêts, notif prefs) déjà migré — suite = UI / onboarding / wiring, pas une migration de fond.
4. Prod (A.5) : après le premier `migrate deploy`, lancer une fois `scripts/seed-interest-macros.ts` (idempotent, hors hook CC).
