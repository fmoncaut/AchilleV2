# Achille — brief produit (contexte pour l'agent)

## Ce qu'est Achille
Une place de marché **de bonnes affaires locales géolocalisées**. L'acheteur voit des produits (souvent en **déstockage**) disponibles **en magasin physique près de lui**, avec pour chaque offre : le **prix remisé**, le **prix de référence** barré (« prix moyen constaté sur internet »), le **pourcentage de remise**, l'**enseigne** et la **distance**. Signature : **« Think global, shop local ».**

Le produit a déjà existé et fonctionné (apps mobiles acheteur + vendeur, et un back-office **web** marchand « Achille Business Solution »). On le refond en **portail web responsive**, en repartant du métier.

## Modèle en trois étapes
- **Affiliation (ce qu'on construit) :** Achille présente l'offre et **renvoie vers le site du marchand** pour l'achat ; on **track** le renvoi. Pas de paiement chez Achille → surface de sécurité et charge RGPD minimales.
- **Directe (plus tard) :** l'achat se fait sur Achille, retrait en magasin (click-and-collect) validé par **QR / code acheteur**, facture. Le POS gère stock et offres.
- **Mobile (plus tard) :** PWA puis natif.

## Les trois interfaces de référence (issues des démos / Figma)

### Acheteur (public)
Onboarding par **catégories** (Electro, Meuble, Sport, Mode, Déco, Food, Auto/Moto, Tech, Brico, Beauté) + choix d'une **zone et d'un rayon** (ex. 5 km) → fil « Recommandé pour toi » / « Déstockage » → **carte** des POS → **fiche produit** (multi-vendeurs : « N offres disponibles », triable par prix/distance) → **fiche magasin** (adresse, horaires, distance). En affiliation, le bouton final = **« Voir l'offre chez le marchand »** (redirection trackée), pas un panier.

### Vendeur / POS (back-office marchand)
Tableau de bord (commandes, produits en catalogue, stats) ; **gestion des offres** : scan EAN → résolution produit + **prix marché** → saisie **stock + prix remisé + TVA** → toggle **« produit en ligne »** ; **import CSV** en masse ; gestion du stock. (Validation de commande par QR/code = phase directe.)

### Achille Business Solution (back-office web — déjà éprouvé)
Version web du back-office marchand : dashboard + statistiques, grille des offres (image, SKU, nom, prix, prix public, stock, actif, état, catégorie), édition d'offre, **import CSV**. C'est le précédent web à reproduire côté enseigne.

## Entités clés du métier
Enseigne (Merchant/Dealer) → Point de vente (POS, géolocalisé) → Offre (= Produit @ POS avec prix remisé, prix de référence, stock, TVA, état, en-ligne, **URL marchand** pour l'affiliation) ; Produit (EAN/gencode, marque, catégorie, prix public de référence) ; Utilisateur acheteur ; Favoris ; Événement de renvoi (tracking affiliation). Détail dans `data-model.md`.

## Non-buts en phase 1
Pas de panier interne, pas de paiement, pas de checkout, pas de livraison, pas d'app native. Le « prix marché » (ancre du −XX %) est un **besoin réel** à alimenter simplement (lookup par EAN), pas l'ancien pipeline lourd.
