import { LegalPage } from "@/components/legal-page";

export const metadata = {
  title: "Mentions légales | Akwire",
};

export default function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions légales">
      <p>
        <strong>Akwire</strong> présente des offres locales. Deux circuits :
        le renvoi vers le site du marchand (affiliation) et, pour les enseignes
        qui l’ont activé, la réservation avec retrait en magasin (empreinte du
        montant, débit au retrait).
      </p>
      <p>
        <strong>Éditeur (à compléter) :</strong> [raison sociale], [forme
        juridique], [adresse du siège], [SIREN], [e-mail de contact].
      </p>
      <p>
        <strong>Hébergement :</strong> Clever Cloud (PaaS, Union européenne).
        Médias : Scaleway Object Storage (UE). E-mails transactionnels : Brevo.
      </p>
      <p>
        <strong>Directeur de la publication (à compléter) :</strong> [nom].
      </p>
    </LegalPage>
  );
}
