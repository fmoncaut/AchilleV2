/**
 * Apparence du Payment Element. Seules ces variables changent :
 * le flux d'empreinte (confirmPayment, return_url, clientSecret) reste ailleurs.
 */
export const stripeAppearance = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "#13263F",
    colorText: "#0E1C2E",
    colorTextSecondary: "#4A5361",
    colorBackground: "#FFFFFF",
    colorDanger: "#B3261E",
    borderRadius: "12px",
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
};
