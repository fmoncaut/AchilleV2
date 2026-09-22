# Réservations click & collect (incréments 2.1 à 2.3)

Une réservation concerne **un seul magasin** et uniquement des offres `kind = DIRECT` en ligne. Les offres `AFFILIATION` ne passent jamais par ce tunnel. L’encaissement est une empreinte Stripe Connect (`capture_method: manual`) : rien n’est débité avant le retrait.

## Fenêtre de retrait

`pickupDeadline` est calculée à la création : maintenant + `RESERVATION_PICKUP_HOURS` (défaut **48 h**, voir `.env.example`). Le stock est mis de côté pour cette fenêtre. L’empreinte Stripe suit la même échéance : à la date limite, elle est annulée avec le statut `EXPIRED`.

## Stock

| Transition | Stock |
| --- | --- |
| Création (`PENDING`) | décrémenté (mis de côté) |
| `CANCELLED`, `EXPIRED`, `NO_SHOW` | ré-incrémenté |
| `PICKED_UP` | reste consommé |

On ne réserve pas au-delà du stock (`UPDATE` conditionnel `stock >= quantité`).

## Expiration

Les statuts `PENDING` et `CONFIRMED` dont `pickupDeadline` est dépassée passent à `EXPIRED`, le stock est rendu et l’empreinte est annulée (`cancel`, rien n’est débité). Si l’annulation Stripe échoue, la réservation reste en l’état pour un nouvel essai. `READY_FOR_PICKUP` n’expire pas toute seule : le vendeur marque `NO_SHOW` après la date limite.

Le passage est paresseux : il s’exécute à l’affichage des listes acheteur et vendeur, et avant chaque transition. On peut aussi le lancer à la main :

```bash
npx tsx scripts/expire-reservations.ts
```

Pas de cron dans cet incrément.

## Tunnel acheteur (incrément 2.2)

Le bouton « Réserver en magasin » ajoute l’offre au **panier de réservation** (`ReservationCart` / `ReservationCartItem`), en base. Pas de `localStorage`. Un compte a un panier ; un invité en a un via le cookie httpOnly `reservationCart` (clé opaque). La confirmation exige une connexion : le panier invité est alors rattaché au compte.

Le panier est **mono-magasin**. Ajouter une offre d’un autre point de vente propose de vider et remplacer. Les offres `AFFILIATION` sont refusées.

Étapes :

1. `/reservation` — récapitulatif (quantités bornées au stock, sous-totaux, total, magasin, distance si une localisation est connue, fenêtre de retrait).
2. `/reservation/retrait` — adresse, horaires, puis l’empreinte Stripe (Payment Element).
3. Confirmation — la réservation passe `CONFIRMED` seulement si l’autorisation est `requires_capture`. Le code de retrait s’affiche alors. Rien n’est débité.

Le panier n’est vidé qu’après cette autorisation. Un refus carte annule la réservation `PENDING` et rend le stock.

## Paiement Stripe Connect (incrément 2.3)

Clés uniquement par l’environnement : `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`. Mode test.

- Chaque enseigne a un compte Connect Express (`stripeAccountId`). Onboarding depuis `/admin/paiements` (ADMIN pour toute enseigne, MERCHANT pour la sienne). Sans `chargesEnabled`, une réservation DIRECT payée est refusée.
- Commission : `Merchant.feeRate` (Decimal), sinon `STRIPE_DEFAULT_FEE_RATE` (défaut 0,08). `application_fee_amount` est calculée à l’empreinte et prélevée sur le reversement vendeur (`transfer_data.destination`), pas ajoutée au total acheteur.
- Empreinte à la confirmation : PaymentIntent `capture_method: manual`, devise `eur`, clé d’idempotence `achille-auth-{reservationId}`. `paymentIntentId` est stocké. La capture n’est jamais appelée depuis le navigateur.
- Capture **uniquement** quand le vendeur valide le `pickupCode` sur `/admin/reservations` (statut `PICKED_UP`). `commissionAmount` et `feeAmount` sont alors renseignés.
- Annulation acheteur et expiration : `cancel` de l’empreinte, stock rendu.
- No-show : `STRIPE_NOSHOW_MODE=cancel` (défaut) libère l’empreinte. `partial` capture une pénalité `STRIPE_NOSHOW_PENALTY_RATE` (obligatoire dans ce mode, Decimal entre 0 et 1) et une commission proportionnelle. Le stock est rendu dans les deux cas.
- Webhook `POST /api/stripe/webhook` : signature vérifiée avec `STRIPE_WEBHOOK_SECRET`. Événements `payment_intent.succeeded`, `payment_intent.canceled`, `payment_intent.amount_capturable_updated`, et `account.updated`. Idempotent via `ProcessedStripeEvent`. Le webhook ne capture pas et ne passe pas la réservation à `PICKED_UP`.

En local : `stripe listen --forward-to localhost:3000/api/stripe/webhook`. Carte de test `4242 4242 4242 4242`, date future, CVC quelconque.
