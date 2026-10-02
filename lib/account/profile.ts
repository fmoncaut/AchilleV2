import { prisma } from "@/lib/db";
import { profileNameSchema } from "@/lib/account/schemas";

export class AccountError extends Error {}

export async function updateProfileName(userId: string, rawName: string) {
  const parsed = profileNameSchema.safeParse({ name: rawName });
  if (!parsed.success) {
    throw new AccountError(
      parsed.error.issues[0]?.message ?? "Nom invalide.",
    );
  }
  await prisma.user.update({
    where: { id: userId },
    data: { name: parsed.data.name },
  });
  return parsed.data.name;
}

export function displayUserName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "Non renseigné";
}
