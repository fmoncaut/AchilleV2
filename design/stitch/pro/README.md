# Écrans Achille Pro

Maquettes de référence exportées depuis le projet Stitch **Achille V2 Web Marketplace** (`projects/3577567773712782775`). Peau Achille conservée. Rebrand Akwire = lot de correctifs identifié par la revue QA/UX, pas pré-requis à l’intégration.

Date d’export : **15 octobre 2026**. Dernière mise à jour du projet Stitch : 14 octobre 2026.

Les routes ci-dessous sont des cibles marchandes à mapper plus tard. Aucune route applicative n’est créée par cet import.

| Fichier | Écran Stitch | Route cible | Statut |
|---|---|---|---|
| `pro-dashboard.html` | Tableau de bord Magasin | `/admin` | importé |
| `pro-catalogue.html` | Mon Catalogue Déstockage | `/admin/offres` | importé |
| `pro-fiche-produit.html` | Fiche Produit Unitaire Déstockage | `/admin/offres/[id]` | importé |
| `pro-commandes.html` | Commandes & Retraits | `/admin/reservations` | importé |
| `pro-stocks.html` | Gestion des Stocks & Emplacements | pas de route dédiée (le stock unitaire vit aujourd’hui sur `/admin/offres/[id]`) | importé |
| `pro-import-csv.html` | Modale d’Import CSV / ERP | `/admin/offres/import` | importé |

Le catalogue retenu est l’écran aligné avec les autres maquettes Pro (`9ea695282f384d88bd17e4da3d4e541e`, 2560 × 3876). La version courte isolée (`ade011dcdeae47e496bf013586edb4f3`) n’est pas importée.

Les images et polices restent des liens distants Stitch. Aucun asset séparé n’accompagne ces HTML.
