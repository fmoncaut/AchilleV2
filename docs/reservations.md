# Réservations click & collect (incrément 2.1)

Une réservation concerne **un seul magasin** et uniquement des offres `kind = DIRECT` en ligne. Aucun paiement n’est encaissé. Les champs `commissionAmount` et `feeAmount` sont prévus pour l’incrément 2.3 et restent vides.

## Fenêtre de retrait

`pickupDeadline` est calculée à la création : maintenant + `RESERVATION_PICKUP_HOURS` (défaut **48 h**, voir `.env.example`). Cette borne courte est la même fenêtre que l’empreinte carte Stripe prévue en 2.3 : le stock est mis de côté le temps de cette autorisation, sans l’encaisser ici.

## Stock

| Transition | Stock |
| --- | --- |
| Création (`PENDING`) | décrémenté (mis de côté) |
| `CANCELLED`, `EXPIRED`, `NO_SHOW` | ré-incrémenté |
| `PICKED_UP` | reste consommé |

On ne réserve pas au-delà du stock (`UPDATE` conditionnel `stock >= quantité`).

## Expiration

Les statuts `PENDING` et `CONFIRMED` dont `pickupDeadline` est dépassée passent à `EXPIRED` et le stock est rendu. `READY_FOR_PICKUP` n’expire pas toute seule : le vendeur marque `NO_SHOW` après la date limite.

Le passage est paresseux : il s’exécute à l’affichage des listes acheteur et vendeur, et avant chaque transition. On peut aussi le lancer à la main :

```bash
npx tsx scripts/expire-reservations.ts
```

Pas de cron dans cet incrément.
