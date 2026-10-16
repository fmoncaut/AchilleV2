"use client";

import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

const LENGTH = 6;

function OtpInput({
  name = "code",
  id = "code",
  className,
}: {
  name?: string;
  id?: string;
  className?: string;
}) {
  const [digits, setDigits] = useState<string[]>(Array.from({ length: LENGTH }, () => ""));
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const code = digits.join("");

  function write(next: string[]) {
    setDigits(next.slice(0, LENGTH));
  }

  function onChange(index: number, raw: string) {
    const char = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    write(next);
    if (char && index < LENGTH - 1) refs.current[index + 1]?.focus();
  }

  function onKeyDown(index: number, key: string) {
    if (key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (key === "ArrowRight" && index < LENGTH - 1) refs.current[index + 1]?.focus();
  }

  function onPaste(text: string) {
    const pasted = text.replace(/\D/g, "").slice(0, LENGTH).split("");
    if (pasted.length === 0) return;
    const next = Array.from({ length: LENGTH }, (_, i) => pasted[i] ?? "");
    write(next);
    refs.current[Math.min(pasted.length, LENGTH - 1)]?.focus();
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <input type="hidden" name={name} value={code} />
      <div className="flex justify-between gap-2" role="group" aria-labelledby={id}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              refs.current[index] = node;
            }}
            id={index === 0 ? id : undefined}
            value={digit}
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            aria-label={`Chiffre ${index + 1} sur ${LENGTH}`}
            maxLength={1}
            className="bg-surface-container-lowest text-body-md text-on-surface border-outline h-12 w-11 rounded-xl border text-center font-bold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
            onChange={(event) => onChange(index, event.target.value)}
            onKeyDown={(event) => onKeyDown(index, event.key)}
            onPaste={(event) => {
              event.preventDefault();
              onPaste(event.clipboardData.getData("text"));
            }}
          />
        ))}
      </div>
    </div>
  );
}

export { OtpInput };
