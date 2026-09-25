"use client";

import { useEffect, useRef, useState } from "react";

import { adminFieldClass } from "@/components/admin/admin-shell";

type Detector = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
};

export function PickupCodeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!scanning) {
      return;
    }
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;

    async function run() {
      const DetectorCtor = (
        window as Window & { BarcodeDetector?: new (opts: { formats: string[] }) => Detector }
      ).BarcodeDetector;
      if (!DetectorCtor || !navigator.mediaDevices?.getUserMedia) {
        setHint("Scan indisponible sur ce navigateur. Saisissez le code.");
        setScanning(false);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch {
        setHint("Caméra refusée. Saisissez le code affiché sur le pass.");
        setScanning(false);
        return;
      }
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      video.srcObject = stream;
      await video.play();
      const detector = new DetectorCtor({ formats: ["qr_code"] });
      const tick = async () => {
        if (stopped || !videoRef.current) {
          return;
        }
        try {
          const codes = await detector.detect(videoRef.current);
          const raw = codes[0]?.rawValue?.trim();
          if (raw) {
            onChange(raw.slice(0, 16).toUpperCase());
            setScanning(false);
            return;
          }
        } catch {
          setHint("Lecture impossible. Saisissez le code.");
          setScanning(false);
          return;
        }
        timer = window.setTimeout(tick, 250);
      };
      timer = window.setTimeout(tick, 250);
    }

    void run();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [scanning, onChange]);

  return (
    <div className="flex flex-col gap-2">
      {scanning ? (
        <video
          ref={videoRef}
          muted
          playsInline
          className="bg-primary-container h-36 w-48 rounded-xl object-cover"
        />
      ) : null}
      <input
        name="pickupCode"
        value={value}
        placeholder="Code de retrait"
        autoComplete="off"
        className={adminFieldClass}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="font-label-md text-label-md text-primary-container text-left font-bold underline-offset-4 hover:underline"
        onClick={() => {
          setHint(null);
          setScanning((current) => !current);
        }}
      >
        {scanning ? "Arrêter le scan" : "Scanner le QR"}
      </button>
      {hint ? <p className="font-body-sm text-error">{hint}</p> : null}
    </div>
  );
}
