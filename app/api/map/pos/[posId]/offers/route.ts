import { NextResponse } from "next/server";

import { findOffersAtPos } from "@/lib/geo";

type RouteContext = {
  params: Promise<{ posId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { posId } = await context.params;
  if (!posId || posId.length > 64) {
    return NextResponse.json({ error: "POS invalide." }, { status: 400 });
  }
  const offers = await findOffersAtPos(posId);
  return NextResponse.json({ offers });
}
