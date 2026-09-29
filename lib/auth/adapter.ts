import type { Adapter } from "@auth/core/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { hashOtpCode, normalizeEmail } from "@/lib/auth/otp";
import { prisma } from "@/lib/db";

/**
 * Adapter Prisma + hash du code OTP au repos.
 * createVerificationToken stocke le HMAC ; useVerificationToken re-hash l'entrée claire.
 */
export function createAuthAdapter(): Adapter {
  const base = PrismaAdapter(prisma);

  return {
    ...base,
    async createVerificationToken(data) {
      const identifier = normalizeEmail(data.identifier);
      const token = hashOtpCode(data.token);
      // Un seul challenge vivant par e-mail.
      await prisma.verificationToken.deleteMany({ where: { identifier } });
      return prisma.verificationToken.create({
        data: {
          identifier,
          token,
          expires: data.expires,
        },
      });
    },
    async useVerificationToken({ identifier, token }) {
      const normalized = normalizeEmail(identifier);
      const hashed = hashOtpCode(token);
      try {
        return await prisma.verificationToken.delete({
          where: {
            identifier_token: { identifier: normalized, token: hashed },
          },
        });
      } catch {
        return null;
      }
    },
  };
}
