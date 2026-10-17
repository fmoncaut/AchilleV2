// À faire relire avant prod
import { LegalPage } from "@/components/legal-page";

export const metadata = {
  title: "Conditions générales d’utilisation | Akwire",
};

export default function CguPage() {
  return (
    <LegalPage title="Conditions générales d’utilisation">
      <p>
        En utilisant Akwire, vous consultez des offres de déstockage disponibles
        dans des magasins. Deux modes coexistent.
      </p>
      <h2 className="font-headline-sm text-headline-sm text-primary-container mt-2">
        Vitrine affiliée
      </h2>
      <p>
        Depuis une fiche, vous pouvez partir sur le site du marchand. Akwire
        enregistre ce renvoi. Le contrat de vente, le paiement et le service
        après-vente relèvent alors du marchand.
      </p>
      <h2 className="font-headline-sm text-headline-sm text-primary-container mt-2">
        Réservation et retrait
      </h2>
      <p>
        Lorsque l’enseigne encaisse sur Akwire, vous réservez un produit pour un
        magasin. Une empreinte bancaire du montant est posée. Vous retirez le
        produit en magasin sous 48 heures. Le débit a lieu au retrait. Si
        l’enseigne n’encaisse pas, la réservation n’est pas proposée.
      </p>
      <h2 className="font-headline-sm text-headline-sm text-primary-container mt-2">
        Compte
      </h2>
      <p>
        L’inscription est facultative pour parcourir le catalogue. Un compte
        permet d’enregistrer des favoris (produits et magasins), isolés par
        utilisateur. Vous êtes responsable de l’accès à votre boîte e-mail
        (code à usage unique).
      </p>
      <h2 className="font-headline-sm text-headline-sm text-primary-container mt-2">
        Responsabilité
      </h2>
      <p>
        Les prix, stocks et disponibilités sont fournis par les enseignes et
        peuvent changer. Akwire n’est pas le vendeur du produit. Textes
        juridiques à faire relire avant mise en production commerciale.
      </p>
    </LegalPage>
  );
}
