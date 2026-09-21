import { UtilityMessage } from "@/components/utility-page";

export const metadata = {
  title: "Hors ligne | Achille",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <UtilityMessage
      kicker="Hors ligne"
      title="Pas de connexion"
      description="L’accueil et les recherches déjà ouvertes restent disponibles. Les prix et stocks se mettent à jour dès le retour du réseau — Achille ne vend pas hors ligne."
      actionHref="/"
      actionLabel="Réessayer l’accueil"
      icon="wifi_off"
    />
  );
}
