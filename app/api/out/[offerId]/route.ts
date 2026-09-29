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
import { offerMatchesPos } from "@/lib/offer-placement";
import { isPosPubliclyVisible, publicPosWhere } from "@/lib/pos-visibility";

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
      kind: true,
      scope: true,
      merchantId: true,
      posId: true,
      feedId: true,
      feed: { select: { status: true } },
      broker: { select: { urlTemplate: true } },
      merchant: { select: { isActive: true } },
      pos: {
        select: {
          id: true,
          status: true,
          merchantId: true,
          merchantClosedAt: true,
        },
      },
      targetedPos: {
        select: {
          posId: true,
          pos: { select: { status: true, merchantClosedAt: true } },
        },
      },
    },
  });

  const feedHidden = Boolean(offer?.feedId && offer.feed?.status !== "ACTIVE");
  if (!offer || !offer.isOnline || !offer.merchantUrl || feedHidden) {
    return jsonError(404, "Offre introuvable", anonId);
  }

  const posSlug = new URL(request.url).searchParams.get("pos")?.trim() ?? "";
  if (posSlug) {
    const pos = await prisma.pos.findUnique({
      where: { slug: posSlug },
      select: {
        id: true,
        merchantId: true,
        status: true,
        merchantClosedAt: true,
        merchant: { select: { isActive: true } },
      },
    });
    const placed =
      pos != null &&
      offerMatchesPos(
        {
          kind: offer.kind,
          scope: offer.scope,
          merchantId: offer.merchantId,
          posId: offer.posId,
          targetedPos: offer.targetedPos,
        },
        pos,
      );
    if (
      !pos ||
      !isPosPubliclyVisible(pos) ||
      !pos.merchant.isActive ||
      !placed
    ) {
      return jsonError(404, "Offre introuvable", anonId);
    }
  } else if (offer.kind === "DIRECT") {
    if (
      !offer.merchant.isActive ||
      !offer.pos ||
      !isPosPubliclyVisible(offer.pos)
    ) {
      return jsonError(404, "Offre introuvable", anonId);
    }
  } else if (offer.scope === "ENSEIGNE") {
    const visible = await prisma.pos.count({
      where: {
        merchantId: offer.merchantId,
        ...publicPosWhere,
        merchant: { isActive: true },
      },
    });
    if (visible === 0) {
      return jsonError(404, "Offre introuvable", anonId);
    }
  } else {
    const targetedVisible = offer.targetedPos.some((link) =>
      isPosPubliclyVisible(link.pos),
    );
    const anchorVisible =
      offer.targetedPos.length === 0 &&
      offer.pos != null &&
      isPosPubliclyVisible(offer.pos);
    if (!offer.merchant.isActive || (!targetedVisible && !anchorVisible)) {
      return jsonError(404, "Offre introuvable", anonId);
    }
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
