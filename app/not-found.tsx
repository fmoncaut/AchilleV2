import { UtilityMessage } from "@/components/utility-page";

export default function NotFound() {
  return (
    <UtilityMessage
      kicker="404"
      title="Page introuvable"
      description="Cette page n’existe pas ou n’est plus en ligne."
      actionHref="/"
      actionLabel="Retour à l’accueil"
      icon="search_off"
    />
  );
}
