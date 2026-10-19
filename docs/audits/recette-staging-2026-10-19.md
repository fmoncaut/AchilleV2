# Recette staging — 19 octobre 2026

Périmètre : https://staging.akwire.fr, design (Vagues 0 à 6) et parcours sensibles.
Aucune correction n’a été faite. Données Electro Depot non modifiées.
Captures : `screenshots/recette/`. Largeur 1 440 px et anneau de focus clavier : non passés.

## Bilan

| Résultat | Nombre |
| --- | ---: |
| OK | 25 |
| KO | 8 |
| Non testé | 7 |

### KO

1. **Cible favori trop petite.** Accueil et cartes offre, 390 px. Bouton « Ajouter aux favoris » mesuré 40×40 px (seuil 44).
2. **Pastille enseigne coupée.** https://staging.akwire.fr/magasin/e2e-pos-muqw9far — la tuile blanche affiche « E2E S / TRIPE / MUQW8TJB » au lieu du nom complet. Capture `a-magasin-e2e-390.png`.
3. **« Distance » trop clair.** Fiche E2E, lien de tri « Distance » en `rgb(110, 119, 132)` sur fond clair.
4. **Stepper du retrait.** https://staging.akwire.fr/reservation/retrait — titre « Informations de retrait », étape active affichée « 3 Paiement ». Capture `b-retrait-390.png`.
5. **Payment Element : pas seulement « Carte ».** Même URL, après « Autoriser l’empreinte ». Stripe Link connecté à `<compte propriétaire>`, Visa Test `···· 4242`, boutons « Confirmer » et « Modifier le moyen de paiement ». Aucun autre message d’erreur. Captures `b-stripe-element-390.png`, `b-stripe-3ds-390.png`. Les deux empreintes ont ensuite abouti (4242 puis 3D Secure).
6. **Tableaux admin coupés à 390 px.** `/admin/paiements` : tableau 740 px, bord droit à 756, la page ne défile pas (`scrollWidth` 390). « Défaut (STRIPE_DEF… » est coupé. `/admin/vendeurs` : seule la colonne e-mail reste visible. Captures `c-paiements-electrodepot-390.png`, `d-marchand-acheteur-390.png`.
7. **Le compte marchand n’est pas sur E2E Stripe.** Connexion `<alias marchand>` → https://staging.akwire.fr/admin/reservations affiche « Back-office · Electrodepot ». La seule ligne est « US6a × 1 », Electro Depot - Fréjus, Expirée. Pas de réservation E2E, pas de code `KTANYCY5`. Aucune action Electro Depot (offre, CSV, magasin, encaissement).
8. **Menu de visibilité désynchronisé.** https://staging.akwire.fr/admin/magasins?q=E2E+POS — après passage à Masqué, le badge dit « Masqué » et le select « Visibilité de E2E POS » reste sur « Publié » (`selectedIndex` 0, valeur `ACTIVE_VISIBLE`).

## État laissé

- E2E POS : **Publié**, source **Manuel** (état d’origine relevé, rétabli après l’essai Masqué).
- Offre E2E : **4 en magasin** (stock rendu).
- Réservations de test : `XWKEFJQH` annulée pendant le parcours ; `KTANYCY5` annulée ensuite, uniquement pour débloquer la suppression du compte (le marchand ne pouvait pas la clôturer).
- `<alias marchand>` : rôle **Acheteur**, enseigne **—** (avant : Vendeur, Electrodepot). « Annuler » n’avait rien changé.
- `<alias acheteur>` : compte supprimé. Accueil `/?compte=supprime`, en-tête « Connexion », pas de page d’erreur.
- Onboarding Connect non lancé.

## Tableau

| Étape | Attendu | Résultat | Capture |
| --- | --- | --- | --- |
| A. En-tête, pied, accueil, 390 px | Encre / Ambre / Crème, Space Grotesk, pas de défilement de page, icônes en glyphes | OK. Fond `rgb(246, 245, 241)`, police Space Grotesk. La rangée de pastilles défile dans son conteneur, pas la page. | `a-accueil-390.png` |
| A. Cibles ≥ 44 px | Contrôles d’en-tête et favoris ≥ 44 px | KO. En-tête 44×44. Favori de carte 40×40. | `a-accueil-390.png` |
| A. Recherche, carte, tiroir, 390 px | Ville + rayon, pin, tiroir E2E | OK. Lyon, 10 km, 1 offre. Pin Encre « E », pastille ambre. Tiroir 25,00 € / 40,00 €, « Réserver et retirer ». | `b-recherche-pin-390.png`, `b-recherche-carte-tiroir-390.png` |
| A. Trois états de pins | Pin avec offres, pin vide, pin inactif | Non testé. Un seul état observé (magasin avec offres). | `b-recherche-pin-390.png` |
| A. Fiche offre E2E, 390 px | Prix en Encre, économie, pas de texte coupé | OK sur le prix et « Vous économisez 15,00 € ». KO contraste « Distance » (voir bilan). | `a-offre-e2e-390.png`, `b-offre-il-reste-390.png` |
| A. Fiche magasin E2E, 390 px | Nom d’enseigne lisible | KO. Pastille « E2E S / TRIPE / MUQW8TJB ». | `a-magasin-e2e-390.png` |
| A. Ville / catégorie, 390 px | Page indexable, prix en Encre | OK. `/frejus/tech`, titre « TECH à Fréjus ». | `a-ville-frejus-tech-390.png` |
| A. Login et OTP, 390 px | Écran connexion puis saisie du code | OK. | `b-login-390.png`, `b-otp-incomplet-390.png` |
| A. Onboarding | Compteur « N sur 5 », 6e case désactivée, CGU, alertes décochées | Non testé. `/compte/onboarding` renvoie vers `/compte` : compte déjà créé. | — |
| A. Panier, 390 px | Récap E2E, total 25,00 € | OK. | `b-panier-390.png` |
| A. Retrait, 390 px | Étape retrait identifiable | KO. Étape active « 3 Paiement » sur la page retrait. | `b-retrait-390.png` |
| A. Empreinte | Seul le moyen « Carte » | KO. Stripe Link, Visa `···· 4242`. | `b-stripe-element-390.png` |
| A. Confirmation et pass, 390 px | QR, code, magasin, échéance | OK. | `b-confirmation-pass-390.png`, `b-pass-affiche-390.png` |
| A. Compte (hub, favoris, réservations, détail, réglages), 390 px | Écrans lisibles, cibles 44 px sur le hub | OK. Hub : favoris, réservations, réglages, déconnexion ≥ 44 px. | `b-compte-hub-390.png`, `b-favoris-magasins-390.png`, `b-reservations-annulee-390.png`, `b-message-fil-390.png`, `b-profil-enregistre-390.png` |
| A. Admin navigation, 390 px | Page courante marquée | OK. « Vue d’ensemble », « Magasins », « Vendeurs », « Réservations », « Paiements » passent en Encre quand ils sont actifs. | `d-admin-nav-390.png`, `c-reservations-electrodepot-390.png` |
| A. Tableaux admin, 390 px | Rien de coupé | KO. Paiements et vendeurs : colonnes hors cadre, pas de défilement de page. | `c-paiements-electrodepot-390.png`, `d-marchand-acheteur-390.png` |
| A. 404 et hors ligne, 390 px | Message et retour | OK. 404 : « Page introuvable ». `/offline` : « Pas de connexion ». Le `title` du 404 reste « Akwire — Think global, shop local ». | `a-404-390.png`, `a-offline-390.png` |
| A. 1 440 px, tous les écrans | Même critères qu’à 390 px | Non testé. | — |
| A. Focus clavier (Tab) | Anneau Encre visible | Non testé. | — |
| B1. OTP incomplet | « Saisissez les 6 chiffres du code. », sans appel | OK. Saisie `123` dans le champ code, Valider. Message exact. `fetch` : aucun. | `b-otp-incomplet-390.png` |
| B1. OTP collé avec un espace | Code accepté | OK. Collage « 192 179 » → le champ devient `192179`, session ouverte. | — |
| B2. Onboarding | Compteur, CGU, alertes décochées | Non testé. Voir A. Onboarding. | — |
| B3. Favoris | Produit et magasin, puis `/compte/favoris` | OK. Produits (1) E2E Prod muqw9far. Magasins (1) E2E POS, Lyon. | `b-favoris-magasins-390.png` |
| B4. Recherche | Ville + rayon, « Effacer les filtres » garde le texte | OK. `q=e2e`, Lyon, 10 km, prix max 50 €. Après effacement : `/recherche?q=e2e&lieu=Lyon&lat=45.758&lng=4.835&r=10`, champ Produit encore `e2e`, « 1 offre dans un rayon de 10 km autour de Lyon. » | `b-recherche-carte-tiroir-390.png` |
| B5. Fiche E2E | « Vous économisez … ». Quantité au-dessus du stock → « Il reste N en magasin » | OK. « Vous économisez 15,00 € ». Quantité 9 (stock 4) → alerte « Il reste 4 en magasin. », quantité ramenée à 4. | `b-offre-il-reste-390.png` |
| B6. Empreinte 4242 | Confirmation, pass, un seul e-mail | OK. Code `KTANYCY5`, E2E Stripe muqw8tjb · E2E POS (Lyon), avant le 20 oct. 2026, 22:57, 25,00 €. Un seul e-mail, objet « Réservation confirmée — code KTANYCY5 », même magasin, « mardi 20 octobre 2026 à 22:57 ». HTML : fond clair `#F6F5F1` / carte blanche, et `@media (prefers-color-scheme: dark)`. Rendu Gmail non ouvert. Le moyen proposé était Link (KO n°5), pas un champ Carte vide. | `b-confirmation-pass-390.png`, `b-pass-affiche-390.png` |
| B7. Seconde empreinte 3D Secure | Second pass | OK. Code `XWKEFJQH`, même magasin, avant le 20 oct. 2026, 23:05. E-mail « Réservation confirmée — code XWKEFJQH ». | `b-confirmation-2-390.png` |
| B8. Annuler la seconde | « Garder » ne change rien, puis confirmer → Annulée | OK. Dialogue « Annuler cette réservation ? ». Après « Garder » : toujours « Confirmée », code `XWKEFJQH`. Après « Confirmer l’annulation » : « Réservation annulée. Le stock a été rendu et l’empreinte, s’il y en avait une, est libérée. » Liste : À retirer 1 (`KTANYCY5`), Annulées 1. | `b-annuler-dialogue-390.png`, `b-reservations-annulee-390.png` |
| B9. Message au magasin | Fil de la 1re réservation | OK. « Bonjour, je passerai retirer cette commande E2E. Merci. » — Acheteur, 18 oct. 2026, 23:22. | `b-message-fil-390.png` |
| B10. Réglages | Profil enregistré, alertes enregistrées | OK. Nom « Acheteur Recette » → « Profil enregistré. » (`/compte/reglages/profil?ok=1`). Alertes bonnes affaires cochées (décochées avant) → « Préférences enregistrées. », case toujours cochée au rechargement. | `b-profil-enregistre-390.png`, `b-alertes-enregistrees-390.png` |
| C1–C5. Marchand sur la 1re réservation E2E | Confirmer, comptoir 768 px, offres, CSV, magasin de test | KO. Compte ouvert sur Electrodepot. Réservation E2E absente. Parcours non exécuté pour ne pas modifier Electro Depot. | `c-reservations-electrodepot-390.png` |
| C2. Comptoir, code faux puis code avec espaces | « Code de retrait incorrect. » puis « Remise validée » | Non testé. Conséquence du KO C. | — |
| C3. Offres créer / modifier / supprimer | Dialogue Annuler, puis confirmer | Non testé. | — |
| C4. Import CSV d’une ligne | Import | Non testé. | — |
| C5. Magasin de test | Création et modification sans « NEXT_REDIRECT », puis fermeture | Non testé. | — |
| C6. Paiements | La page s’affiche, sans lancer Connect | OK sur l’affichage. Enseigne Electrodepot, Connect « Non commencé », commission « Défaut (STRIPE_DEFAULT_FEE_RATE) ». Bouton « Activer l’encaissement » non cliqué. | `c-paiements-electrodepot-390.png` |
| C. No-show | Bouton après l’échéance | Non testable. Échéance au 20 oct. 2026, et le comptoir E2E n’a pas été atteint. | — |
| D. Navigation superadmin | Page active visible | OK. `<compte propriétaire>`, « Console Akwire ». Vue d’ensemble : 83 enseignes, 10 550 magasins. | `d-admin-nav-390.png` |
| D. Visibilité E2E POS | Changer puis remettre l’état d’origine | OK. Origine : Publié, Manuel. Passage à Masqué : badge « Masqué ». Retour : Publié, Manuel. Le select restait sur « Publié » pendant le badge Masqué (KO n°8). | `d-e2e-masque-390.png` |
| D. Retrait d’accès `fmoncaut+marchand` | Annuler ne change rien, puis confirmer | OK. Avant : « Vendeur », « Electrodepot ». Après « Annuler » : inchangé. Après « Retirer l’accès » : « Acheteur », enseigne « — ». Message « Rattachement enregistré. » | `d-retrait-acces-390.png`, `d-marchand-acheteur-390.png` |
| E. Suppression du compte acheteur | Saisie SUPPRIMER, accueil, « Connexion », aucune page d’erreur | OK, après avoir annulé `KTANYCY5`. Premier essai : bouton désactivé, alerte « Terminez ou annulez vos réservations en cours avant de supprimer votre compte. » Ensuite : accueil `/?compte=supprime`, en-tête « Connexion », pas de page d’erreur. | `e-suppression-bloquee-390.png`, `e-accueil-apres-suppression.png` |
