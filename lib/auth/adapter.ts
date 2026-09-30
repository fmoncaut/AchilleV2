import type { Adapter } from "@auth/core/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { normalizeEmail } from "@/lib/auth/otp";
import { prisma } from "@/lib/db";

/**
 * Adapter Prisma + normalisation e-mail.
 * Auth.js hashe déjà le token (SHA-256 de `${token}${secret}`) avant
 * createVerificationToken / useVerificationToken — on stocke tel quel.
 */
export function createAuthAdapter(): Adapter {
  const base = PrismaAdapter(prisma);

  return {
    ...base,
    async createVerificationToken(data) {
      const identifier = normalizeEmail(data.identifier);
      // Un seul challenge vivant par e-mail.
      await prisma.verificationToken.deleteMany({ where: { identifier } });
      return prisma.verificationToken.create({
        data: {
          identifier,
          token: data.token,
          expires: data.expires,
        },
      });
    },
    async useVerificationToken({ identifier, token }) {
      const normalized = normalizeEmail(identifier);
      try {
        return await prisma.verificationToken.delete({
          where: {
            identifier_token: { identifier: normalized, token },
          },
        });
      } catch {
        return null;
      }
    },
  };
}
