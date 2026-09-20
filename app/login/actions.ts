"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn } from "@/auth";

const emailSchema = z.string().trim().email();

function safeCallbackUrl(raw: unknown): string {
  if (typeof raw !== "string") {
    return "/compte";
  }
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) {
    return "/compte";
  }
  return raw;
}

export async function signInWithEmail(formData: FormData) {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    redirect("/login?erreur=email");
  }

  await signIn("email", {
    email: parsed.data,
    redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
  });
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
