"use client";

import { useEffect, useId, useRef, useState } from "react";

import { adminFieldClass } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const fieldId = useId();
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
    <div className="flex w-full flex-col gap-2">
      {scanning ? (
        <video
          ref={videoRef}
          muted
          playsInline
          className="bg-primary-container h-36 w-full rounded-xl object-cover"
        />
      ) : null}
      <label
        htmlFor={fieldId}
        className="font-body-md text-body-md text-primary-container font-bold"
      >
        Code de retrait
      </label>
      <input
        id={fieldId}
        name="pickupCode"
        value={value}
        placeholder="Code de retrait"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        autoComplete="off"
        className={cn(
          adminFieldClass,
          "text-primary-container h-12 min-h-12 text-[20px] tracking-[0.2em] font-bold",
        )}
        onChange={(event) =>
          onChange(event.target.value.replace(/[\s-]/g, ""))
        }
      />
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={() => {
          setHint(null);
          setScanning((current) => !current);
        }}
      >
        {scanning ? "Arrêter le scan" : "Scanner le QR"}
      </Button>
      {hint ? (
        <p className="font-body-md text-body-md text-error" role="status">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
