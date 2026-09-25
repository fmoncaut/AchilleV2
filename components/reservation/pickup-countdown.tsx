"use client";

import { useEffect, useState } from "react";

import { formatPickupHold } from "@/lib/reservations/hold-label";

export function PickupCountdown({
  deadlineIso,
  initialNowIso,
}: {
  deadlineIso: string;
  initialNowIso: string;
}) {
  const [label, setLabel] = useState(() =>
    formatPickupHold(new Date(deadlineIso), new Date(initialNowIso)),
  );

  useEffect(() => {
    const deadline = new Date(deadlineIso);
    const tick = () => setLabel(formatPickupHold(deadline, new Date()));
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [deadlineIso]);

  return (
    <div className="bg-secondary-fixed text-on-secondary-fixed rounded-2xl px-3 py-2">
      <p className="font-label-md text-label-md font-bold">
        À retirer avant le {label.when} — {label.remaining}
      </p>
      <p className="font-body-sm text-body-sm mt-1">
        Si le retrait n’a pas lieu à temps, l’empreinte est libérée et le stock
        est rendu.
      </p>
    </div>
  );
}
