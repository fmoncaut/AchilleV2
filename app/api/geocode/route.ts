import { NextResponse } from "next/server";
import { z } from "zod";

import { geocodeAddress, reverseGeocode } from "@/lib/geocode";

export const dynamic = "force-dynamic";

const querySchema = z
  .object({
    q: z.string().trim().max(200).optional(),
    lat: z.coerce.number().gte(-90).lte(90).optional(),
    lng: z.coerce.number().gte(-180).lte(180).optional(),
  })
  .refine(
    (value) =>
      Boolean(value.q && value.q.length >= 3) ||
      (value.lat != null && value.lng != null),
    { message: "q ou lat+lng requis" },
  );

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    lat: url.searchParams.get("lat") ?? undefined,
    lng: url.searchParams.get("lng") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Requête de géocodage invalide.", hits: [] },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.q) {
      const hits = await geocodeAddress(parsed.data.q);
      return NextResponse.json({ hits });
    }

    const hit = await reverseGeocode(parsed.data.lat!, parsed.data.lng!);
    return NextResponse.json({ hits: hit ? [hit] : [] });
  } catch {
    return NextResponse.json(
      { error: "Géocodage indisponible pour le moment.", hits: [] },
      { status: 502 },
    );
  }
}
