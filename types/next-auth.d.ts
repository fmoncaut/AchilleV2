import { type DefaultSession } from "next-auth";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      merchantId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    merchantId: string | null;
  }
}
