import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";

/** Cookie d’attribution anonyme — à déclarer dans la passe RGPD (incrément 1.5). */
export const ANON_ID_COOKIE = "anonId";

/** Durée de vie ~1 an. Identifiant opaque, pas de PII. */
export const ANON_ID_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * Fenêtre anti double-comptage trivial (rechargement / double-clic).
 * Un second GET vers la même offre avec le même anonId (ou le même userId)
 * dans cette fenêtre n’insère pas d’OfferClick ; la redirection a lieu quand même.
 */
export const CLICK_DEDUP_WINDOW_SECONDS = 60;

export const offerIdParamSchema = z
  .string()
  .trim()
  .min(8)
  .max(40)
  .regex(/^[a-z0-9]+$/i, "Identifiant d’offre invalide");

const anonIdSchema = z.uuid();

export function parseAnonId(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }
  const parsed = anonIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function createAnonId(): string {
  return crypto.randomUUID();
}

export function readAnonIdFromRequest(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) {
    return null;
  }

  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const name = trimmed.slice(0, eq);
    if (name !== ANON_ID_COOKIE) {
      continue;
    }
    return parseAnonId(decodeURIComponent(trimmed.slice(eq + 1)));
  }

  return null;
}

export function resolveAnonId(request: Request): string {
  return readAnonIdFromRequest(request) ?? createAnonId();
}

export function applyAnonIdCookie(response: NextResponse, anonId: string): void {
  response.cookies.set(ANON_ID_COOKIE, anonId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ANON_ID_MAX_AGE_SECONDS,
    path: "/",
  });
}

/**
 * Referrer minimisé : origine + chemin, sans query (peut contenir des e-mails).
 * Jamais d’IP, user-agent ou e-mail dans OfferClick.
 */
export function sanitizeReferrer(raw: string | null): string | null {
  if (!raw) {
    return null;
  }

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return `${url.origin}${url.pathname}`.slice(0, 200);
  } catch {
    return null;
  }
}

export type RecordOfferClickInput = {
  offerId: string;
  userId: string | null;
  sessionId: string;
  referrer: string | null;
};

export type RecordOfferClickResult = {
  recorded: boolean;
};

export async function recordOfferClick(
  input: RecordOfferClickInput,
): Promise<RecordOfferClickResult> {
  const since = new Date(Date.now() - CLICK_DEDUP_WINDOW_SECONDS * 1000);

  const duplicate = await prisma.offerClick.findFirst({
    where: {
      offerId: input.offerId,
      createdAt: { gte: since },
      OR: [
        { sessionId: input.sessionId },
        ...(input.userId ? [{ userId: input.userId }] : []),
      ],
    },
    select: { id: true },
  });

  if (duplicate) {
    return { recorded: false };
  }

  await prisma.offerClick.create({
    data: {
      offerId: input.offerId,
      userId: input.userId,
      sessionId: input.sessionId,
      referrer: sanitizeReferrer(input.referrer),
    },
  });

  return { recorded: true };
}
