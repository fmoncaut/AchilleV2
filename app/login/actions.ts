"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn } from "@/auth";

const emailSchema = z.string().trim().email();

function safeRedirectPath(): string {
  return "/compte";
}

export async function signInWithEmail(formData: FormData) {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    redirect("/login?erreur=email");
  }

  await signIn("email", {
    email: parsed.data,
    redirectTo: safeRedirectPath(),
  });
}

export async function signInWithGoogle() {
  await signIn("google", {
    redirectTo: safeRedirectPath(),
  });
}

export async function signInWithApple() {
  await signIn("apple", {
    redirectTo: safeRedirectPath(),
  });
}
