/**
 * Vérifs locales durcissement OTP (4 points).
 * Usage: npx tsx scripts/verify-otp-hardening.ts
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const eq = line.indexOf("=");
  if (eq > 0 && !process.env[line.slice(0, eq)]) {
    process.env[line.slice(0, eq)] = line.slice(eq + 1);
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function runCase(
  label: string,
  envOverrides: Record<string, string | null>,
  body: string,
): Record<string, unknown> {
  const file = join(process.cwd(), `scripts/_tmp-otp-case-${label}.mts`);
  writeFileSync(file, body, "utf8");
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const [key, value] of Object.entries(envOverrides)) {
    if (value === null) delete env[key];
    else env[key] = value;
  }
  try {
    const result = spawnSync("npx", ["tsx", file], {
      env,
      encoding: "utf8",
      cwd: process.cwd(),
      shell: true,
    });
    const stdout = (result.stdout ?? "").trim();
    const stderr = (result.stderr ?? "").trim();
    if ((result.status ?? 1) !== 0) {
      throw new Error(
        `[${label}] exit ${result.status}\nstdout: ${stdout}\nstderr: ${stderr}`,
      );
    }
    const line = stdout.split(/\r?\n/).filter(Boolean).at(-1) ?? "";
    return JSON.parse(line) as Record<string, unknown>;
  } finally {
    try {
      unlinkSync(file);
    } catch {
      // ignore
    }
  }
}

async function main() {
  assert(
    process.env.SMTP_KEY || process.env.SMTP_PASSWORD,
    "SMTP key manquante",
  );
  assert(process.env.EMAIL_FROM, "EMAIL_FROM manquant pour le test d'envoi");

  const keyOnly = runCase(
    "key",
    { SMTP_PASSWORD: null },
    `
    import { smtpPassword, isSmtpConfigured } from "../lib/auth-env.ts";
    if (!smtpPassword) throw new Error("SMTP_KEY non lu");
    if (!isSmtpConfigured) throw new Error("isSmtpConfigured false");
    console.log(JSON.stringify({ ok: true, via: "SMTP_KEY" }));
    `,
  );

  const noFrom = runCase(
    "nofrom",
    { EMAIL_FROM: null },
    `
    import { sendOtpEmail } from "../lib/auth-email.ts";
    import { emailFrom } from "../lib/auth-env.ts";
    if (emailFrom) throw new Error("EMAIL_FROM encore présent");
    try {
      await sendOtpEmail({ identifier: "test@example.com", token: "111111" });
      throw new Error("aurait dû échouer");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("aurait dû")) throw e;
      if (!msg.includes("EMAIL_FROM")) throw new Error("mauvaise erreur: " + msg);
      if (msg.includes("noreply@localhost")) throw new Error("fallback localhost");
      console.log(JSON.stringify({ ok: true, error: msg }));
    }
    `,
  );

  const badSmtp = runCase(
    "badsmtp",
    {
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: "1",
      SMTP_PASSWORD: "wrong-key-for-test",
      SMTP_KEY: "wrong-key-for-test",
    },
    `
    import { sendOtpEmail } from "../lib/auth-email.ts";
    try {
      await sendOtpEmail({ identifier: "test@example.com", token: "222222" });
      throw new Error("aurait dû échouer");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("aurait dû")) throw e;
      console.log(JSON.stringify({ ok: true, threw: true, message: msg.slice(0, 160) }));
    }
    `,
  );

  const branding = runCase(
    "branding",
    {},
    `
    import { OTP_MAIL_SUBJECT, buildOtpMailContent } from "../lib/auth-email.ts";
    const content = buildOtpMailContent("424242");
    if (content.subject !== "Votre code Akwire") throw new Error("sujet=" + content.subject);
    if (OTP_MAIL_SUBJECT !== "Votre code Akwire") throw new Error("const");
    if (!content.text.includes("Akwire") || content.text.includes("Achille")) {
      throw new Error("branding incorrect");
    }
    if (!content.html.includes("Akwire") || content.html.includes("Achille")) {
      throw new Error("html branding incorrect");
    }
    console.log(JSON.stringify({ ok: true, subject: OTP_MAIL_SUBJECT }));
    `,
  );

  let sendOk: Record<string, unknown>;
  try {
    sendOk = runCase(
      "send",
      {},
      `
    import { sendOtpEmail, OTP_MAIL_SUBJECT } from "../lib/auth-email.ts";
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await sendOtpEmail({ identifier: "fmoncaut@gmail.com", token: code });
    console.log(JSON.stringify({ ok: true, subject: OTP_MAIL_SUBJECT, code }));
    `,
    );
  } catch (error) {
    sendOk = {
      ok: false,
      error: error instanceof Error ? error.message.slice(0, 240) : String(error),
      note: "Échec transport (souvent clé SMTP invalide/tronquée). Branding déjà validé à part.",
    };
  }

  console.log(
    JSON.stringify(
      {
        "1_smtp_key_alias": keyOnly,
        "2_email_from_required": noFrom,
        "3_smtp_failure_propagates": badSmtp,
        "4a_branding_awire": branding,
        "4b_send_live": sendOk,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
