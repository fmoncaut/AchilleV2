import { LegalPage } from "@/components/legal-page";

export const metadata = {
  title: "Politique de confidentialité | Achille",
};

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité">
      <p>
        Achille minimise les données : pas de panier interne, pas de paiement,
        pas de profilage publicitaire. Les comptes vivent dans notre base
        PostgreSQL hébergée en UE.
      </p>
      <h2 className="font-headline-sm text-headline-sm text-primary-container mt-2">
        Données collectées
      </h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Compte : e-mail, nom éventuel (Auth.js — e-mail magique, Apple ou Google Identity).</li>
        <li>Favoris : identifiants de produits et de magasins, liés à votre compte uniquement.</li>
        <li>
          Renvois affiliation : <code>OfferClick</code> (offre, userId si
          connecté sinon null, cookie anonId, referrer sans query). Pas d’IP, pas
          de user-agent, pas d’e-mail dans cet événement.
        </li>
        <li>Localisation approximative de recherche (lastLat / lastLng) si vous en indiquez une.</li>
      </ul>
      <h2 className="font-headline-sm text-headline-sm text-primary-container mt-2">
        Cookies
      </h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>anonId</strong> : cookie technique httpOnly, SameSite=Lax, ~1
          an, posé lors d’un renvoi vers un marchand. Identifiant opaque, pas de
          donnée personnelle.
        </li>
        <li>
          <strong>Session Auth.js</strong> : indispensable si vous vous
          connectez.
        </li>
        <li>
          <strong>achille_consent</strong> : mémorise votre choix (mesure
          d’audience ou cookies techniques seulement).
        </li>
      </ul>
      <p>
        La mesure d’audience (Plausible ou Matomo, UE) n’est chargée{" "}
        <strong>qu’après consentement</strong>, et seulement si elle est
        configurée. Vous pouvez refuser.
      </p>
      <p>
        <strong>Droits (à compléter : DPO / contact) :</strong> accès,
        rectification, effacement, opposition. Autorité : CNIL.
      </p>
    </LegalPage>
  );
}
