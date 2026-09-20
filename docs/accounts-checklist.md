# Achille — checklist des comptes & services à ouvrir

Dans l'ordre où les incréments en ont besoin. Rien n'est requis pour 0.1. La stack est souveraine : privilégier les fournisseurs UE.

## Dès 0.2 (base de données)
- [ ] PostgreSQL + PostGIS. Dev : Docker (image `postgis/postgis`) — aucun compte. Déploiement : add-on PostgreSQL Clever Cloud (PostGIS supporté). → variable DATABASE_URL.

## Dès 0.3 (auth) — tous optionnels au départ (l'app tourne sans)
- [ ] Google OAuth : Google Cloud Console → OAuth 2.0 Client ID (type Web). → GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET. Redirect URI : `<URL>/api/auth/callback/google`.
- [ ] Apple Sign in : compte développeur Apple (payant, plus lourd) → Services ID + clé. À faire seulement quand tu veux le bouton Apple.
- [ ] E-mail (lien magique) : en dev le lien s'affiche en console. En prod : SMTP Brevo (français) → variables SMTP + adresse expéditeur.
- [ ] AUTH_SECRET : généré (`openssl rand -base64 32`).

## Dès 0.4 (déploiement)
- [ ] Clever Cloud : compte + application Node/Next + add-on PostgreSQL.
- [ ] GitHub : dépôt réel (remplace le repo temporaire) → permet PR + CI/CD. Auth déploiement via OIDC (pas de clé statique).

## Phase 1 (affiliation)
- [ ] Tuiles carte IGN Géoplateforme (souveraine) — vérifier les conditions d'accès/clé éventuelle.
- [ ] Stockage médias : Scaleway Object Storage (UE) + CDN (Bunny ou Scaleway).
- [ ] Analytics : Plausible (hébergé UE) ou Matomo auto-hébergé.

## Rappel sécurité (avant toute remise en service du legacy)
- [ ] Révoquer les secrets exposés dans l'ancien dépôt : clés AWS (AKIA…), clé d'API fuzion-core, clés TLS committées.
