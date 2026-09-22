import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";

import { auth } from "@/auth";
import { countCartUnits, type CartOwner } from "@/lib/reservations/cart";

export const RESERVATION_CART_COOKIE = "reservationCart";

const SESSION_KEY = /^[a-f0-9]{32}$/;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function readCartSessionKey(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(RESERVATION_CART_COOKIE)?.value ?? "";
  return SESSION_KEY.test(value) ? value : null;
}

export async function ensureCartSessionKey(): Promise<string> {
  const existing = await readCartSessionKey();
  if (existing) {
    return existing;
  }
  const key = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set(RESERVATION_CART_COOKIE, key, cookieOptions());
  return key;
}

export async function currentCartOwner(): Promise<CartOwner> {
  const session = await auth();
  return {
    userId: session?.user?.id ?? null,
    sessionKey: await readCartSessionKey(),
  };
}

export async function ownerForCartWrite(): Promise<CartOwner> {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (userId) {
    return { userId, sessionKey: await readCartSessionKey() };
  }
  return { userId: null, sessionKey: await ensureCartSessionKey() };
}

export async function headerCartCount(): Promise<number> {
  return countCartUnits(await currentCartOwner());
}
