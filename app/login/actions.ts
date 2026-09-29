"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn } from "@/auth";
import {
  assertCanSendOtp,
  hashIp,
  normalizeEmail,
  recordOtpSent,
  verifyOtpAttempt,
} from "@/lib/auth/otp";
import { isEmailAuthEnabled, isSmtpConfigured } from "@/lib/auth-env";

const emailSchema = z.string().trim().email();
const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Code invalide.");

function safeCallbackUrl(raw: unknown): string {
  if (typeof raw !== "string") {
    return "/compte";
  }
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) {
    return "/compte";
  }
  return raw;
}

async function clientIpHash(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip") || null;
  return hashIp(ip);
}

function otpPage(email: string, callbackUrl: string, erreur?: string) {
  const params = new URLSearchParams({
    email,
    callbackUrl,
  });
  if (erreur) params.set("erreur", erreur);
  return `/login/otp?${params.toString()}`;
}

export async function requestOtpAction(formData: FormData) {
  if (!isEmailAuthEnabled) {
    redirect("/login?erreur=email_indisponible");
  }
  if (process.env.NODE_ENV === "production" && !isSmtpConfigured) {
    redirect("/login?erreur=email_indisponible");
  }

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    redirect("/login?erreur=email");
  }

  const email = normalizeEmail(parsed.data);
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));
  const ip = await clientIpHash();

  const canSend = await assertCanSendOtp(email, ip);
  if (!canSend.ok) {
    redirect(otpPage(email, callbackUrl, canSend.error));
  }

  try {
    await signIn("email", {
      email,
      redirect: false,
    });
  } catch (error) {
    // Auth.js peut throw NEXT_REDIRECT même avec redirect:false selon version ;
    // on ignore les redirects et on continue vers /login/otp.
    const dig = error as { digest?: string };
    if (typeof dig?.digest === "string" && dig.digest.startsWith("NEXT_REDIRECT")) {
      // fall through
    } else {
      console.error("[auth] envoi OTP échoué", error);
      redirect("/login?erreur=envoi");
    }
  }

  await recordOtpSent(email, ip);
  redirect(otpPage(email, callbackUrl));
}

export async function resendOtpAction(formData: FormData) {
  return requestOtpAction(formData);
}

export async function verifyOtpAction(formData: FormData) {
  const emailParsed = emailSchema.safeParse(formData.get("email"));
  const codeParsed = otpSchema.safeParse(formData.get("code"));
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));

  if (!emailParsed.success) {
    redirect("/login?erreur=email");
  }
  const email = normalizeEmail(emailParsed.data);

  if (!codeParsed.success) {
    redirect(otpPage(email, callbackUrl, "invalid"));
  }

  const result = await verifyOtpAttempt(email, codeParsed.data);
  if (!result.ok) {
    redirect(otpPage(email, callbackUrl, result.error));
  }

  // Auth.js consomme le token (hashé via adapter) et crée la session DB.
  const params = new URLSearchParams({
    email,
    token: codeParsed.data,
    callbackUrl,
  });
  redirect(`/api/auth/callback/email?${params.toString()}`);
}

export async function signInWithGoogle(formData: FormData) {
  await signIn("google", {
    redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
  });
}

export async function signInWithApple(formData: FormData) {
  await signIn("apple", {
    redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
  });
}
