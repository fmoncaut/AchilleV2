import { prisma } from "@/lib/db";
import { MAX_ONBOARDING_INTERESTS, TERMS_VERSION } from "@/lib/auth/terms";

export class OnboardingError extends Error {}

export type CompleteOnboardingInput = {
  userId: string;
  interestCategoryIds: string[];
  acceptTerms: boolean;
  marketingOptIn: boolean;
};

/**
 * Finalise l'onboarding : intérêts (0–5), CGU, prefs notification.
 * Skip et submit posent tous deux onboardingCompletedAt.
 *
 * DEAL_ALERTS global (interestCategoryId null) = master switch marketing.
 * U.6 ajoutera des overrides par macro contre ce master.
 */
export async function completeOnboarding(
  input: CompleteOnboardingInput,
): Promise<void> {
  if (!input.acceptTerms) {
    throw new OnboardingError("L’acceptation des CGU est obligatoire.");
  }

  const uniqueIds = [
    ...new Set(input.interestCategoryIds.map((id) => id.trim())),
  ].filter(Boolean);
  if (uniqueIds.length > MAX_ONBOARDING_INTERESTS) {
    throw new OnboardingError(
      `Choisissez au plus ${MAX_ONBOARDING_INTERESTS} centres d’intérêt.`,
    );
  }

  if (uniqueIds.length > 0) {
    const count = await prisma.interestCategory.count({
      where: { id: { in: uniqueIds } },
    });
    if (count !== uniqueIds.length) {
      throw new OnboardingError("Centre d’intérêt inconnu.");
    }
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: {
        termsAcceptedAt: now,
        termsVersion: TERMS_VERSION,
        onboardingCompletedAt: now,
      },
    });

    await tx.userInterest.deleteMany({ where: { userId: input.userId } });
    if (uniqueIds.length > 0) {
      await tx.userInterest.createMany({
        data: uniqueIds.map((interestCategoryId) => ({
          userId: input.userId,
          interestCategoryId,
        })),
      });
    }

    const orderUpdates = await tx.notificationPreference.findFirst({
      where: {
        userId: input.userId,
        kind: "ORDER_UPDATES",
        interestCategoryId: null,
      },
    });
    if (orderUpdates) {
      await tx.notificationPreference.update({
        where: { id: orderUpdates.id },
        data: { emailEnabled: true },
      });
    } else {
      await tx.notificationPreference.create({
        data: {
          userId: input.userId,
          kind: "ORDER_UPDATES",
          interestCategoryId: null,
          emailEnabled: true,
          pushEnabled: false,
        },
      });
    }

    const dealAlerts = await tx.notificationPreference.findFirst({
      where: {
        userId: input.userId,
        kind: "DEAL_ALERTS",
        interestCategoryId: null,
      },
    });
    if (dealAlerts) {
      await tx.notificationPreference.update({
        where: { id: dealAlerts.id },
        data: { emailEnabled: input.marketingOptIn },
      });
    } else {
      await tx.notificationPreference.create({
        data: {
          userId: input.userId,
          kind: "DEAL_ALERTS",
          interestCategoryId: null,
          emailEnabled: input.marketingOptIn,
          pushEnabled: false,
        },
      });
    }
  });
}
