/** Affichage dérivé de pickupDeadline. Ne change aucun statut. */
export function formatPickupHold(deadline: Date, now: Date): {
  when: string;
  remaining: string;
  overdue: boolean;
} {
  const when = deadline.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });
  const ms = deadline.getTime() - now.getTime();
  if (ms <= 0) {
    return { when, remaining: "délai dépassé", overdue: true };
  }
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const remaining =
    hours > 0
      ? minutes > 0
        ? `il reste ${hours}h ${minutes}min`
        : `il reste ${hours}h`
      : `il reste ${Math.max(minutes, 1)} min`;
  return { when, remaining, overdue: false };
}
