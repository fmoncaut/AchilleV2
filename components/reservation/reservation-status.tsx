import type { ReservationStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/reservations/service";

const STATUS_BADGE = {
  PENDING: "neutral",
  CONFIRMED: "info",
  READY_FOR_PICKUP: "success",
  PICKED_UP: "neutral",
  CANCELLED: "neutral",
  NO_SHOW: "danger",
  EXPIRED: "neutral",
} as const satisfies Record<
  ReservationStatus,
  "neutral" | "info" | "success" | "danger"
>;

export function ReservationStatusBadge({
  status,
}: {
  status: ReservationStatus;
}) {
  return <Badge variant={STATUS_BADGE[status]}>{STATUS_LABELS[status]}</Badge>;
}
