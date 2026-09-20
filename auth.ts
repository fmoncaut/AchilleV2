import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import type { Provider } from "next-auth/providers";

import { sendVerificationRequest } from "@/lib/auth-email";
import {
  appleClientId,
  appleClientSecret,
  emailFrom,
  googleClientId,
  googleClientSecret,
  isAppleAuthEnabled,
  isEmailAuthEnabled,
  isGoogleAuthEnabled,
  isSmtpConfigured,
  smtpHost,
  smtpPassword,
  smtpPort,
  smtpUser,
} from "@/lib/auth-env";
import { prisma } from "@/lib/db";

function buildProviders(): Provider[] {
  const providers: Provider[] = [];

  if (isEmailAuthEnabled) {
    providers.push(
      Nodemailer({
        id: "email",
        name: "E-mail",
        from: emailFrom,
        server: isSmtpConfigured
          ? {
              host: smtpHost,
              port: smtpPort,
              auth: {
                user: smtpUser,
                pass: smtpPassword,
              },
            }
          : { host: "127.0.0.1", port: 25 },
        sendVerificationRequest,
      }),
    );
  }

  if (isGoogleAuthEnabled && googleClientId && googleClientSecret) {
    providers.push(
      Google({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      }),
    );
  }

  if (isAppleAuthEnabled && appleClientId && appleClientSecret) {
    providers.push(
      Apple({
        clientId: appleClientId,
        clientSecret: appleClientSecret,
      }),
    );
  }

  return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  trustHost: true,
  pages: {
    signIn: "/login",
    verifyRequest: "/login/envoye",
    error: "/login",
  },
  providers: buildProviders(),
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
        session.user.merchantId = user.merchantId;
      }
      return session;
    },
  },
});
