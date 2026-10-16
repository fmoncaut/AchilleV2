import { LegalPage } from "@/components/legal-page";

export const metadata = {
  title: "Politique de confidentialité | Akwire",
  description:
    "Données collectées par Akwire : compte, favoris, recherche locale, renvoi affiliation et réservation avec retrait en magasin.",
};

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité" showDraftNotice={false}>
      <p>
        Akwire met en relation un acheteur et un magasin proche. Deux circuits
        coexistent : le renvoi vers le site du marchand (affiliation) et, lorsque
        l’enseigne a activé l’encaissement, la réservation avec retrait en
        magasin.
      </p>
      <h2 className="font-headline-sm text-headline-sm text-primary-container mt-2">
        Responsable et contact
      </h2>
      <p>
        Le responsable du traitement est l’éditeur d’Akwire. La raison sociale
        et le SIREN figurent dans les mentions légales dès qu’ils sont publiés.
        Pour exercer vos droits ou joindre le délégué à la protection des
        données : <strong>support@akwire.fr</strong>.
      </p>
      <p>
        Hébergement de l’application et de la base PostgreSQL : Clever Cloud
        (Union européenne). Médias : Scaleway Object Storage (UE). E-mails
        transactionnels : Brevo. Carte : tuiles IGN Géoplateforme, sans Google
        Maps. L’empreinte bancaire d’une réservation est traitée par Stripe.
      </p>
      <h2 className="font-headline-sm text-headline-sm text-primary-container mt-2">
        Données et finalités
      </h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Compte : adresse e-mail et code à usage unique (Auth.js). Nom et
          centres d’intérêt, seulement si vous les renseignez. Finalité :
          connexion, personnalisation du fil, gestion du compte.
        </li>
        <li>
          Favoris : identifiants de produits et de magasins, liés à votre
          compte.
        </li>
        <li>
          Recherche : lieu saisi ou position approximative du navigateur, rayon,
          et dernière position enregistrée sur le compte si vous êtes connecté.
          Finalité : afficher les offres et les distances.
        </li>
        <li>
          Affiliation : lors d’un renvoi, un événement <code>OfferClick</code>{" "}
          (offre, compte si connecté sinon vide, cookie technique, page
          d’origine sans paramètres). Pas d’adresse IP, pas de navigateur, pas
          d’e-mail dans cet événement. Finalité : compter les renvois vers le
          marchand. Le paiement, s’il a lieu, se fait sur le site du marchand.
        </li>
        <li>
          Réservation (retrait) : panier mono-magasin, quantités, magasin,
          code de retrait, statut, et empreinte du montant via Stripe. Le débit
          n’a lieu qu’au retrait. Akwire ne conserve pas le numéro de carte.
        </li>
        <li>
          Alertes : préférence d’e-mail pour les bonnes affaires. Les e-mails
          liés à une réservation restent envoyés.
        </li>
      </ul>
      <h2 className="font-headline-sm text-headline-sm text-primary-container mt-2">
        Durées
      </h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Compte, favoris, intérêts et préférences : jusqu’à la suppression du compte.</li>
        <li>
          Cookie technique <strong>anonId</strong> : environ un an. Il sert à
          ne pas compter deux fois le même renvoi.
        </li>
        <li>
          Session de connexion : le temps de la session Auth.js.
        </li>
        <li>
          Réservation et pièces associées (code de retrait, statut, empreinte) :
          le temps du suivi du retrait, puis la durée nécessaire aux obligations
          comptables.
        </li>
        <li>
          Mesure d’audience : uniquement si vous l’acceptez, et seulement
          lorsqu’un outil européen (Plausible ou Matomo) est configuré.
        </li>
      </ul>
      <h2 className="font-headline-sm text-headline-sm text-primary-container mt-2">
        Cookies
      </h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>anonId</strong> : cookie technique httpOnly, SameSite=Lax,
          posé lors d’un renvoi vers un marchand. Identifiant opaque.
        </li>
        <li>
          <strong>Session Auth.js</strong> : indispensable si vous vous
          connectez.
        </li>
        <li>
          <strong>achille_consent</strong> : mémorise votre choix (mesure
          d’audience, ou cookies techniques seulement).
        </li>
      </ul>
      <p>
        Vous pouvez refuser la mesure d’audience. Les cookies techniques
        nécessaires au compte, au renvoi et à la réservation restent utilisés.
      </p>
      <h2 className="font-headline-sm text-headline-sm text-primary-container mt-2">
        Vos droits
      </h2>
      <p>
        Vous pouvez accéder à vos données, les rectifier, les effacer, vous
        opposer à un traitement ou en demander la limitation. La suppression du
        compte est proposée dans les réglages : elle demande de saisir
        SUPPRIMER. Pour toute demande : support@akwire.fr. Vous pouvez aussi
        saisir la CNIL.
      </p>
      <p>
        Ce texte décrit le fonctionnement actuel du service. Il ne remplace pas
        une relecture juridique avant une ouverture commerciale, en particulier
        pour l’identité complète de l’éditeur.
      </p>
    </LegalPage>
  );
}
