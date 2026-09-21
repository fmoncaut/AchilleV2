# Achille — Design System (source : export Stitch « Achille V2 »)

Référence unique pour l'apparence d'Achille. Tokens exacts, à câbler dans Tailwind v4
(`@theme` dans app/globals.css) + variables CSS. Les écrans Stitch de référence sont
dans `design/stitch/` (chaque dossier a `code.html` + `screen.png`).

> Périmètre : ce design couvre le produit complet (affiliation + « directe »/click &
> collect). On applique le **système** (tokens, polices, composants) partout, mais on
> ne construit en affiliation QUE la découverte, la carte, la fiche offre et la fiche
> magasin. Panier, paiement, retrait QR, casiers, terminal magasin = Phase 2, référence
> seulement.

## Polices
- **Bricolage Grotesque** (600/700/800) — display, titres (headlines), prix.
- **Manrope** (400/500/600/700/800) — corps de texte, labels.
- **Material Symbols Outlined** — icônes (police d'icônes open-source Apache ; ce n'est
  pas une dépendance de données/tracking, elle est compatible avec la règle « no Google »
  qui vise Maps/Analytics/Places, pas les polices). Charger via next/font (auto-hébergé)
  de préférence.

Chargement recommandé : `next/font/google` pour Bricolage Grotesque et Manrope
(auto-hébergées par Next, bon pour la perf et la souveraineté). Exposer en variables
CSS `--font-display` et `--font-body`.

## Couleurs (Material 3 — valeurs exactes)
```
surface / background         #f8f9fc
surface-dim                  #d8dadd
surface-container-lowest     #ffffff
surface-container-low        #f2f4f7
surface-container            #eceef1
surface-container-high       #e6e8eb
surface-container-highest    #e0e3e6
surface-variant              #e0e3e6
on-surface                   #191c1e
on-surface-variant           #43474d
outline                      #73777e
outline-variant              #c3c7ce
inverse-surface              #2d3133
inverse-on-surface           #eff1f4

primary                      #001020
on-primary                   #ffffff
primary-container            #002642   ← le navy Achille
on-primary-container         #708eaf
inverse-primary              #abc9ed
primary-fixed                #d0e4ff
primary-fixed-dim            #abc9ed
on-primary-fixed             #001d34
on-primary-fixed-variant     #2a4967

secondary                    #8a5100
on-secondary                 #ffffff
secondary-container          #fe9800   ← l'orange Achille (CTA/prix/badges)
on-secondary-container       #643900
secondary-fixed              #ffdcbd
secondary-fixed-dim          #ffb86f
on-secondary-fixed           #2c1600
on-secondary-fixed-variant   #693c00

tertiary                     #001309
on-tertiary                  #ffffff
tertiary-container           #002b1a
on-tertiary-container        #2f9d70   ← vert « ouvert / éco / vérifié »
tertiary-fixed               #8ef7c2
tertiary-fixed-dim           #72daa8
on-tertiary-fixed            #002113
on-tertiary-fixed-variant    #005235

error                        #ba1a1a
on-error                     #ffffff
error-container              #ffdad6
on-error-container           #93000a

surface-tint                 #436180
```

## Échelle typographique (nom : taille / interligne / graisse / police)
```
display            48/56  800  Bricolage Grotesque
display-mobile     34/40  800  Bricolage Grotesque
headline-lg        32/38  700  Bricolage Grotesque
headline-lg-mobile 26/32  700  Bricolage Grotesque
headline-md        24/30  700  Bricolage Grotesque
headline-sm        20/26  600  Bricolage Grotesque
price-hero         28/32  800  Bricolage Grotesque
price-card         20/24  800  Bricolage Grotesque
body-lg            18/28  400  Manrope
body-md            15/22  500  Manrope   ← corps par défaut
body-sm            13/18  500  Manrope
label-lg           14/20  700  Manrope
label-md           12/16  700  Manrope
label-xs           10/12  800  Manrope
```

## Rayons & espacements
```
radius : DEFAULT 0.25rem · lg 0.5rem · xl 0.75rem · full 9999px (pills)
spacing: xs 0.25 · sm 0.5 · md 1 · lg 1.5 · xl 2 (rem) ; gutter 1 ; margin-desktop 2
```

## Motifs de composants (observés dans les écrans)
- **Pills partout** : boutons, chips de rayon (2/5/10/20 km), filtres, nav catégories —
  `rounded-full`, fond navy (primary-container) pour l'actif, surface-container pour l'inactif.
- **En-tête** collant, `backdrop-blur`, fond surface-container-lowest translucide, ombre
  douce teintée navy `rgba(0,38,66,0.06)`.
- **Cartes d'offre** : image + badge remise orange (`-XX%`), tag enseigne, prix remisé
  (secondary/orange) + prix barré (on-surface-variant), enseigne + distance + statut
  « ouvert » (vert tertiaire). CTA affiliation = « Voir chez le marchand / Voir sur X »
  (mention « lien sécurisé et tracké »).
- **Badges d'état** : vert tertiaire pour « ouvert / vérifié / éco », orange pour
  « déstockage / promo », navy pour les puces d'action.
- **CTA primaire** : bouton navy (primary-container, texte blanc) OU orange
  (secondary-container, texte navy) pour l'action forte. Ombres douces teintées navy.
- **Icônes** : Material Symbols Outlined, taille 16–22px, souvent en orange pour accent.

## Note d'intégration
Les écrans Stitch utilisent le CDN Tailwind (`cdn.tailwindcss.com`) + un `tailwind.config`
inline. NE PAS reprendre le CDN : traduire ces tokens dans le thème Tailwind v4 du projet
(`@theme` dans app/globals.css). Le CDN et les images `lh3.googleusercontent.com` des
maquettes sont des artefacts de maquette, pas des dépendances à embarquer.
