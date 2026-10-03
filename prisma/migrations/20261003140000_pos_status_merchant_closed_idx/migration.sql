-- R2 : filtre carte ACTIVE_VISIBLE / INACTIVE_VISIBLE + merchantClosedAt IS NULL
CREATE INDEX IF NOT EXISTS "Pos_status_merchantClosedAt_idx"
  ON "Pos" ("status", "merchantClosedAt");
