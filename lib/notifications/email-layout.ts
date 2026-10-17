import { getSiteUrl } from "@/lib/site";

/** PNG servi par Next (`app/apple-icon.png`). Les SVG ne s’affichent pas dans Gmail ni Outlook. */
export function emailLogoUrl(): string {
  return `${getSiteUrl()}/apple-icon.png`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Texte brut d’une notification → paragraphes HTML échappés. */
export function textToEmailHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => {
      const line = escapeHtml(block).replaceAll("\n", "<br>");
      return `<p class="email-text" style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#0E1C2E;">${line}</p>`;
    })
    .join("");
}

/**
 * Gabarit commun : tableau 600 px, styles inline, logo PNG + mot « akwire ».
 * Le clair est le rendu par défaut. Le sombre suit `prefers-color-scheme`.
 */
export function renderEmailLayout(options: {
  preheader: string;
  title: string;
  bodyHtml: string;
}): string {
  const logo = escapeHtml(emailLogoUrl());
  const preheader = escapeHtml(options.preheader);
  const title = escapeHtml(options.title);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${title}</title>
<style>
  :root { color-scheme: light dark; }
  @media (prefers-color-scheme: dark) {
    .email-canvas, .email-canvas td { background:#0E1C2E !important; }
    .email-card, .email-card td { background:#13263F !important; }
    .email-text, .email-text p, .email-title { color:#F6F5F1 !important; }
    .email-word { color:#F6F5F1 !important; }
    .email-muted { color:#B7C2CE !important; }
  }
</style>
</head>
<body class="email-canvas" bgcolor="#F6F5F1" style="margin:0;padding:0;background:#F6F5F1;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>
<table role="presentation" class="email-canvas" width="100%" bgcolor="#F6F5F1" cellpadding="0" cellspacing="0" style="background:#F6F5F1;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" class="email-card" width="600" bgcolor="#FFFFFF" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:16px;">
        <tr>
          <td style="padding:28px 24px 8px;">
            <img src="${logo}" alt="Akwire" width="48" height="48" style="display:block;border:0;outline:none;text-decoration:none;">
            <p class="email-word" style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:24px;font-weight:600;letter-spacing:-0.03em;color:#13263F;">akwire</p>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 24px 28px;">
            <h1 class="email-title email-text" style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:28px;font-weight:700;color:#13263F;">${title}</h1>
            ${options.bodyHtml}
          </td>
        </tr>
      </table>
      <p class="email-muted" style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#4A5361;">Akwire — Think global, shop local</p>
    </td>
  </tr>
</table>
</body>
</html>`;
}
