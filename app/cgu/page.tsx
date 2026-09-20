import { LegalPage } from "@/components/legal-page";

export const metadata = {
  title: "Conditions générales d’utilisation | Achille",
};

export default function CguPage() {
  return (
    <LegalPage title="Conditions générales d’utilisation">
      <p>
        En utilisant Achille, vous accédez à une vitrine d’offres locales. Le
        contrat de vente, le paiement et le service après-vente relèvent du
        marchand vers lequel vous êtes redirigé.
      </p>
      <h2 className="text-navy mt-2 text-xl font-bold">Objet</h2>
      <p>
        Achille met en relation un acheteur et un point de vente physique via
        une fiche offre et un lien d’affiliation tracké. Aucun panier Achille,
        aucun paiement sur la plateforme (phase affiliation).
      </p>
      <h2 className="text-navy mt-2 text-xl font-bold">Compte</h2>
      <p>
        L’inscription est facultative pour parcourir le catalogue. Un compte
        permet d’enregistrer des favoris (produits et magasins), isolés par
        utilisateur. Vous êtes responsable de l’accès à votre boîte e-mail
        (lien magique).
      </p>
      <h2 className="text-navy mt-2 text-xl font-bold">Responsabilité</h2>
      <p>
        Les prix, stocks et disponibilités sont fournis par les enseignes et
        peuvent changer. Achille n’est pas partie au contrat de vente. Textes
        juridiques à faire relire avant mise en production commerciale.
      </p>
    </LegalPage>
  );
}
