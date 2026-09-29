import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import type { Provider } from "next-auth/providers";

import { createAuthAdapter } from "@/lib/auth/adapter";
import { generateOtpCode, OTP_TTL_MS } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/auth-email";
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

function buildProviders(): Provider[] {
  const providers: Provider[] = [];

  if (isEmailAuthEnabled) {
    providers.push(
      Nodemailer({
        id: "email",
        name: "E-mail",
        from: emailFrom,
        maxAge: OTP_TTL_MS / 1000,
        generateVerificationToken: async () => generateOtpCode(),
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
        async sendVerificationRequest({ identifier, token }) {
          await sendOtpEmail({ identifier, token });
        },
      }),
    );
  }

  if (isGoogleAuthEnabled && googleClientId && googleClientSecret) {
    providers.push(
      Google({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        // E-mail Google vérifié + OTP/Apple vérifiés → un User par e-mail.
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  if (isAppleAuthEnabled && appleClientId && appleClientSecret) {
    providers.push(
      Apple({
        clientId: appleClientId,
        clientSecret: appleClientSecret,
        allowDangerousEmailAccountLinking: true,
        // Limitation connue U.1 : « Hide My Email » (@privaterelay.appleid.com)
        // peut fragmenter un même humain en 2 User (relais ≠ e-mail OTP).
      }),
    );
  }

  return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: createAuthAdapter(),
  session: { strategy: "database" },
  trustHost: true,
  pages: {
    signIn: "/login",
    verifyRequest: "/login/otp",
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
