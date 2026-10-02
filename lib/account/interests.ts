import { MAX_ONBOARDING_INTERESTS } from "@/lib/auth/terms";
import { interestsUpdateSchema } from "@/lib/account/schemas";
import { prisma } from "@/lib/db";

export class InterestsError extends Error {}

/** Remplace les intérêts du compte (0–5 macros), mêmes règles que l’onboarding. */
export async function replaceUserInterests(
  userId: string,
  interestCategoryIds: string[],
): Promise<string[]> {
  const parsed = interestsUpdateSchema.safeParse({ interestCategoryIds });
  if (!parsed.success) {
    throw new InterestsError(
      parsed.error.issues[0]?.message ?? "Centres d’intérêt invalides.",
    );
  }

  const uniqueIds = [...new Set(parsed.data.interestCategoryIds)].filter(Boolean);
  if (uniqueIds.length > MAX_ONBOARDING_INTERESTS) {
    throw new InterestsError(
      `Choisissez au plus ${MAX_ONBOARDING_INTERESTS} centres d’intérêt.`,
    );
  }

  if (uniqueIds.length > 0) {
    const count = await prisma.interestCategory.count({
      where: { id: { in: uniqueIds } },
    });
    if (count !== uniqueIds.length) {
      throw new InterestsError("Centre d’intérêt inconnu.");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.userInterest.deleteMany({ where: { userId } });
    if (uniqueIds.length > 0) {
      await tx.userInterest.createMany({
        data: uniqueIds.map((interestCategoryId) => ({
          userId,
          interestCategoryId,
        })),
      });
    }
  });

  return uniqueIds;
}
