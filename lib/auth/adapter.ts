import type { Adapter, AdapterUser } from "@auth/core/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { normalizeEmail } from "@/lib/auth/otp";
import { prisma } from "@/lib/db";

/**
 * Adapter Prisma + normalisation e-mail.
 * Auth.js hashe déjà le token (SHA-256 de `${token}${secret}`) avant
 * createVerificationToken / useVerificationToken — on stocke tel quel.
 * Compte anonymisé (deletedAt) : getUser* / session → null.
 */
export function createAuthAdapter(): Adapter {
  const base = PrismaAdapter(prisma);

  return {
    ...base,
    async getUser(id) {
      const user = await prisma.user.findFirst({
        where: { id, deletedAt: null },
      });
      return (user as AdapterUser | null) ?? null;
    },
    async getUserByEmail(email) {
      const user = await prisma.user.findFirst({
        where: { email: normalizeEmail(email), deletedAt: null },
      });
      return (user as AdapterUser | null) ?? null;
    },
    async getUserByAccount(providerAccountId) {
      const user = await base.getUserByAccount?.(providerAccountId);
      if (!user) return null;
      const live = await prisma.user.findFirst({
        where: { id: user.id, deletedAt: null },
        select: { id: true },
      });
      return live ? user : null;
    },
    async getSessionAndUser(sessionToken) {
      const result = await base.getSessionAndUser?.(sessionToken);
      if (!result) return null;
      const live = await prisma.user.findFirst({
        where: { id: result.user.id, deletedAt: null },
        select: { id: true },
      });
      if (!live) {
        await prisma.session.deleteMany({ where: { sessionToken } });
        return null;
      }
      return result;
    },
    async createVerificationToken(data) {
      const identifier = normalizeEmail(data.identifier);
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
