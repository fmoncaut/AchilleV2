import QRCode from "qrcode";

export async function pickupCodeSvg(code: string): Promise<string> {
  const svg = await QRCode.toString(code, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#002642", light: "#ffffff" },
  });
  return svg
    .replace(/<\?xml[^>]*>/, "")
    .replace("<svg ", '<svg role="img" aria-hidden="true" class="h-auto w-full" ');
}
