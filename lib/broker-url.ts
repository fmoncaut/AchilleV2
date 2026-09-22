import { isAbsoluteHttpUrl } from "@/lib/merchant-url";

const PLACEHOLDER = /\{(merchant_url|click_id|sub_id)\}/g;

export type BrokerUrlVars = {
  merchantUrl: string;
  clickId: string;
  subId: string;
};

/**
 * Construit l'URL de sortie d'un broker.
 * {merchant_url} en tête de gabarit est inséré tel quel ; ailleurs il est encodé.
 * {click_id} et {sub_id} sont toujours encodés.
 */
export function buildBrokerRedirectUrl(
  template: string,
  vars: BrokerUrlVars,
): string | null {
  if (!isAbsoluteHttpUrl(vars.merchantUrl)) {
    return null;
  }

  const url = template.replace(PLACEHOLDER, (token, key: string, offset: number) => {
    if (key === "merchant_url" && offset === 0) {
      return vars.merchantUrl;
    }
    if (key === "merchant_url") {
      return encodeURIComponent(vars.merchantUrl);
    }
    if (key === "click_id") {
      return encodeURIComponent(vars.clickId);
    }
    return encodeURIComponent(vars.subId);
  });

  if (url.includes("{") || url.includes("}")) {
    return null;
  }
  return isAbsoluteHttpUrl(url) ? url : null;
}

/** Message d'erreur, ou null si le gabarit est utilisable. */
export function brokerTemplateError(template: string): string | null {
  const value = template.trim();
  if (!value.includes("{click_id}")) {
    return "Le gabarit doit contenir {click_id}.";
  }
  if (/\{(?!merchant_url\}|click_id\}|sub_id\})[^}]*\}/.test(value)) {
    return "Placeholder inconnu. Utilisez {merchant_url}, {click_id} et {sub_id}.";
  }
  const built = buildBrokerRedirectUrl(value, {
    merchantUrl: "https://marchand.example/offre/1",
    clickId: "clic-exemple",
    subId: "00000000-0000-4000-8000-000000000000",
  });
  if (!built) {
    return "Le gabarit ne produit pas une URL http(s).";
  }
  if (!built.includes(encodeURIComponent("clic-exemple")) && !built.includes("clic-exemple")) {
    return "Le click_id n'apparaît pas dans l'URL finale.";
  }
  return null;
}
