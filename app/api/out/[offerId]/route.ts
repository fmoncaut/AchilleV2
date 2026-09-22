import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  applyAnonIdCookie,
  offerIdParamSchema,
  recordOfferClick,
  resolveAnonId,
  sanitizeReferrer,
} from "@/lib/affiliation";
import { buildBrokerRedirectUrl } from "@/lib/broker-url";
import { prisma } from "@/lib/db";
import { isAbsoluteHttpUrl } from "@/lib/merchant-url";

export const dynamic = "force-dynamic";

function jsonError(
  status: number,
  error: string,
  anonId: string,
): NextResponse {
  const response = NextResponse.json({ error }, { status });
  response.headers.set("Cache-Control", "no-store");
  applyAnonIdCookie(response, anonId);
  return response;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ offerId: string }> },
) {
  const anonId = resolveAnonId(request);
  const { offerId: rawId } = await context.params;
  const parsed = offerIdParamSchema.safeParse(rawId);

  if (!parsed.success) {
    return jsonError(404, "Offre introuvable", anonId);
  }

  const offer = await prisma.offer.findUnique({
    where: { id: parsed.data },
    select: {
      id: true,
      isOnline: true,
      merchantUrl: true,
      broker: { select: { urlTemplate: true } },
    },
  });

  if (!offer || !offer.isOnline || !offer.merchantUrl) {
    return jsonError(404, "Offre introuvable", anonId);
  }

  if (!isAbsoluteHttpUrl(offer.merchantUrl)) {
    return jsonError(400, "URL marchand invalide", anonId);
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const click = await recordOfferClick({
    offerId: offer.id,
    userId,
    sessionId: anonId,
    referrer: sanitizeReferrer(request.headers.get("referer")),
  });

  let destination = offer.merchantUrl;
  if (offer.broker) {
    const built = buildBrokerRedirectUrl(offer.broker.urlTemplate, {
      merchantUrl: offer.merchantUrl,
      clickId: click.id,
      subId: anonId,
    });
    if (!built) {
      return jsonError(400, "URL de sortie invalide", anonId);
    }
    destination = built;
  }

  if (!isAbsoluteHttpUrl(destination)) {
    return jsonError(400, "URL de sortie invalide", anonId);
  }

  const response = NextResponse.redirect(destination, 302);
  response.headers.set("Cache-Control", "no-store");
  applyAnonIdCookie(response, anonId);
  return response;
}
