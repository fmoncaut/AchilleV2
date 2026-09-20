# Prompt Cursor — Incrément 0.1 (Bootstrap)

Coller tel quel dans l'agent Cursor, à la racine du dépôt (avec .cursor/rules/achille.mdc et docs/ présents).

---

Contexte : tu démarres le dépôt Achille — un portail web (place de marché de bonnes affaires locales géolocalisées). Respecte en permanence les règles de `.cursor/rules/achille.mdc` et le contexte de `docs/project-brief.md`.

Tâche : implémente UNIQUEMENT l'incrément 0.1 (Bootstrap) de `docs/roadmap-increments.md`. NE crée PAS le modèle de données, l'auth, la carte ni aucune logique métier — ce sont les incréments suivants. Arrête-toi à la fin de 0.1.

Périmètre :
- Next.js dernière version stable, App Router, TypeScript strict.
- Tailwind CSS (dernière stable) + shadcn/ui initialisé.
- ESLint + Prettier configurés ; scripts npm dev / build / lint / format.
- Arborescence de départ :
    app/
      layout.tsx        // <html lang="fr">, header simple avec le logo texte "Achille" + baseline "Think global, shop local"
      page.tsx          // page d'accueil vide stylée (titre + sous-titre), rien de métier
      globals.css
    components/
      ui/               // composants shadcn
    lib/
      utils.ts
    prisma/             // dossier vide pour l'instant (placeholder .gitkeep)
    docs/               // déjà présent (ne pas écraser)
    .env.example        // variables attendues, SANS valeurs (ex: DATABASE_URL=, AUTH_SECRET=)
    .gitignore          // ignore .env, node_modules, .next
    README.md           // ne pas écraser docs/, compléter la racine si besoin

Design tokens (identité Achille, source Figma) — câble-les dans la config Tailwind de la version installée (thème @theme en v4, ou tailwind.config.ts en v3), et expose-les aussi en variables CSS dans globals.css :
    --navy:      #002642   // surfaces sombres, en-têtes, texte fort
    --navy-2:    #163952   // navy surélevé
    --orange:    #FF9900   // CTA, prix, badges de remise
    --slate:     #27475E   // texte secondaire
    --paper:     #FBFAF8   // fond clair
    Rayon de coin par défaut généreux (cartes arrondies), police sans-serif grasse.
La page d'accueil doit montrer ces couleurs : en-tête navy, un bouton/CTA orange de démonstration. Contenu en français.

Contraintes (rappelées depuis les règles) :
- Aucun secret en dur : tout via variables d'environnement ; fournis .env.example.
- Server Components par défaut ; "use client" seulement si nécessaire.
- Pas de dépendance Google Maps/Places, pas de paiement, pas de panier interne.

Critères d'acceptation (à vérifier avant de t'arrêter) :
1. `npm run dev` sert une page d'accueil stylée aux couleurs Achille (en-tête navy + CTA orange).
2. `npm run build` et `npm run lint` passent sans erreur.
3. Aucun secret dans le dépôt ; .env.example documente les variables ; .gitignore ignore .env.
4. TypeScript strict activé ; arborescence conforme ci-dessus.

Quand c'est fait : liste les fichiers créés et confirme les 4 critères. N'enchaîne pas sur l'incrément 0.2.
