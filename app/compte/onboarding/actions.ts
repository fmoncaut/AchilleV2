"use server";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  completeOnboarding,
  OnboardingError,
} from "@/lib/auth/onboarding";
import { MAX_ONBOARDING_INTERESTS } from "@/lib/auth/terms";

function safeNext(raw: unknown): string {
  if (typeof raw !== "string") return "/compte";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) {
    return "/compte";
  }
  if (raw.startsWith("/compte/onboarding")) return "/compte";
  return raw;
}

export async function completeOnboardingAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/compte/onboarding");
  }

  const interestCategoryIds = formData
    .getAll("interestCategoryId")
    .filter((v): v is string => typeof v === "string");
  const acceptTerms = formData.get("acceptTerms") === "1";
  const marketingOptIn = formData.get("marketingOptIn") === "1";
  const skipped = formData.get("skipped") === "1";
  const next = safeNext(formData.get("callbackUrl"));

  try {
    await completeOnboarding({
      userId: session.user.id,
      interestCategoryIds: skipped
        ? []
        : interestCategoryIds.slice(0, MAX_ONBOARDING_INTERESTS),
      acceptTerms,
      marketingOptIn,
    });
  } catch (error) {
    if (error instanceof OnboardingError) {
      redirect(
        `/compte/onboarding?erreur=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }

  redirect(next);
}
