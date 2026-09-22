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

## Tunnel acheteur (incrément 2.2)

Le bouton « Réserver en magasin » ajoute l’offre au **panier de réservation** (`ReservationCart` / `ReservationCartItem`), en base. Pas de `localStorage`. Un compte a un panier ; un invité en a un via le cookie httpOnly `reservationCart` (clé opaque). La confirmation exige une connexion : le panier invité est alors rattaché au compte.

Le panier est **mono-magasin**. Ajouter une offre d’un autre point de vente propose de vider et remplacer. Les offres `AFFILIATION` sont refusées.

Étapes :

1. `/reservation` — récapitulatif (quantités bornées au stock, sous-totaux, total, magasin, distance si une localisation est connue, fenêtre de retrait).
2. `/reservation/retrait` — adresse, horaires, consignes, puis l’encart désactivé **« Étape paiement — ajoutée en 2.3 »**.
3. Confirmation — crée la réservation `PENDING` (même modèle qu’en 2.1), met le stock de côté, affiche le `pickupCode`.

En 2.3, l’empreinte Stripe se glisse **dans cet encart**, entre les informations de retrait et le bouton « Confirmer la réservation ». La confirmation et la machine à états ne changent pas.
