# Primitives UI

Peau Akwire. Les classes Material 3 (`bg-primary-container`, `text-secondary`…) viennent de `app/globals.css`. Importer `cn` depuis `@/lib/utils`. Icônes : `MaterialIcon`, jamais Lucide.

Ces primitives sont posées en Vague 0. Les vagues suivantes les branchent écran par écran. Ne pas réécrire un écran ici « pour voir ».

## Button

Rôle : action. `default` et `primary` sont le même bouton : fond ambre, texte Encre. `secondary` : fond Encre, texte blanc. Aussi `outline`, `ghost`, `destructive`, `link`.

Hauteur par défaut `h-11` (44 px). `loading` affiche un spinner, pose `aria-busy` et garde la largeur du libellé. Incompatible avec `asChild`.

À ne pas faire : texte blanc sur ambre, hauteur sous 44 px pour l'action principale, `variant="link"` sur fond Encre (le lien est en ambre foncé, prévu pour le fond clair).

## Input, Textarea, Label, FieldHint, FieldError

Champs en 16 px, rayon `xl`, hauteur 44 px. Relier l'erreur avec `aria-invalid` et `aria-describedby` pointant vers l'id de `FieldError` (`role="alert"`) ou de `FieldHint`.

À ne pas faire : un champ sous 16 px, un placeholder à la place du label.

## OtpInput

Six cases, collage, flèches, `inputmode="numeric"`, `autocomplete="one-time-code"` sur la première. Un champ caché `name="code"` (le même que `/login/otp`) porte la valeur soumise. Ne pas le brancher sur la page de login avant la Vague 3.

## Card

Surface blanche, bordure `outline-variant`, rayon `2xl`. Avec `href`, un seul lien entoure la carte et prend le focus.

À ne pas faire : un second lien ou un bouton par-dessus toute la carte.

## Badge

`promo` (ambre / Encre), `success` (ouvert), `neutral`, `danger`, `info`. Le badge promo n'est pas le prix.

## Chip et ChipRow

`Chip` est un bouton `aria-pressed`. `ChipRow` défile horizontalement avec un masque de bord. Prévu pour les macros et les rayons.

## Dialog

Modale Radix : focus piégé, Échap, retour du focus. `title` est obligatoire. Le bouton fermer est « Fermer ».

À ne pas faire : une modale sans titre, ou un dialogue maison `<dialog>` pour un nouveau cas.

## Sheet

Même base que Dialog. Bas de l'écran sur mobile, panneau droit à partir de `lg`. Candidat du drawer carte : ne pas remplacer `pos-drawer.tsx` tant que la synchro avec la carte n'est pas rejouée.

## Toaster

`sonner`, zone dans `AppShell`, `aria-live` géré par la librairie. `toast()` depuis `@/components/ui/toaster`.

## Skeleton, OfferCardSkeleton, OfferListSkeleton

Réservent la place des cartes. Pas de texte. `aria-hidden` sur la forme, le message « Chargement » est à côté, pour les lecteurs d'écran.

## EmptyState

Icône, titre, texte, une action principale, une action secondaire optionnelle. `heading="h1"` seulement s'il n'y a pas d'autre titre de page. `components/search/empty-state.tsx` et `UtilityMessage` passent par ici ; leurs props publiques ne changent pas.

## Price

Prix vendu, prix barré, badge de remise. Tailles `hero` et `card`. Le nom accessible est « 12,90 €, au lieu de 19,90 € ». En Vague 0 le chiffre est en `text-secondary` (ambre foncé, lisible). La cible Vague 2 est l'Encre, l'ambre restant au badge.

`PriceTag` délègue à `Price` et garde `size="md" | "lg"`.

## Section, PageHeader

`Section` est le conteneur `max-w-page`. `BuyerSection` l'utilise. `PageHeader` : titre, sous-titre, actions, fil d'Ariane.

## AppShell

Header collant, contenu, footer, bannière cookies, toasts, enregistrement PWA. Branché dans `app/layout.tsx`.
