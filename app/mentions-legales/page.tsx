import { LegalPage } from "@/components/legal-page";

export const metadata = {
  title: "Mentions légales | Achille",
};

export default function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions légales">
      <p>
        <strong>Achille</strong> est une place de marché d’affiliation : nous
        présentons des offres locales et renvoyons vers le site du marchand. Nous
        n’encaissons aucun paiement à ce stade.
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
