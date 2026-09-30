export type GeoCursorKey = {
  distanceM: number;
  priceRemise: string;
  id: string;
};

export type NationalCursorKey = {
  updatedAt: string; // ISO
  id: string;
};

export type FeedCursorPayload = {
  v: 1;
  scope: "geo" | "national";
  interest?: GeoCursorKey | NationalCursorKey;
  discovery?: GeoCursorKey | NationalCursorKey;
  /** Cursor unique (mode non perso / pill macro). */
  single?: GeoCursorKey | NationalCursorKey;
};

export function encodeFeedCursor(payload: FeedCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeFeedCursor(raw: string | null | undefined): FeedCursorPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as FeedCursorPayload;
    if (parsed?.v !== 1) return null;
    if (parsed.scope !== "geo" && parsed.scope !== "national") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isGeoCursor(
  key: GeoCursorKey | NationalCursorKey | undefined,
): key is GeoCursorKey {
  return Boolean(key && "distanceM" in key && "priceRemise" in key);
}

export function isNationalCursor(
  key: GeoCursorKey | NationalCursorKey | undefined,
): key is NationalCursorKey {
  return Boolean(key && "updatedAt" in key);
}
