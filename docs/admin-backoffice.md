# Back-office enseigne (incrément 1.1)

Espace protégé `/admin` : session Auth.js obligatoire, puis rôle `MERCHANT` ou `ADMIN` **et** `User.merchantId` renseigné. Un marchand ne liste, n’édite, ne publie et ne retire que les offres de **son** enseigne (`where: { merchantId }`).

## Marquer un utilisateur comme marchand

1. Se connecter une fois sur `/login` (crée la ligne `User`).
2. Rattacher le compte à une enseigne du seed :

```bash
npx tsx scripts/promote-merchant.ts vous@exemple.fr bricomarche
```

Enseignes du seed : `bricomarche`, `alinea`, `norauto`. Pour un second compte (test d’isolation) :

```bash
npx tsx scripts/promote-merchant.ts autre@exemple.fr alinea
```

Vérifier l’isolation des listes :

```bash
npx tsx scripts/verify-tenant-isolation.ts
```

## Import CSV

Modèle : `docs/exemples/offres-import.csv` (copie téléchargeable : `/exemples/offres-import.csv`).

Colonnes : `ean`, `nom`, `categorie`, `prix_remise`, `prix_reference`, `tva`, `stock`, `condition`, `pos`, `merchant_url`.

`pos` = slug du magasin (ex. `bricomarche-lyon-8e`). `categorie` = slug (`brico`, `meuble`, `auto-moto`). Les lignes invalides sont rapportées ; les valides sont importées.
