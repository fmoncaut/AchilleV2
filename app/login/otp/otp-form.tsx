"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

const INCOMPLETE_CODE = "Saisissez les 6 chiffres du code.";

type OtpVerifyFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  email: string;
  callbackUrl: string;
  serverMessage: string | null;
};

export function OtpVerifyForm({
  action,
  email,
  callbackUrl,
  serverMessage,
}: OtpVerifyFormProps) {
  const [clientMessage, setClientMessage] = useState<string | null>(null);
  const message = clientMessage ?? serverMessage;

  function rejectIncomplete() {
    setClientMessage(INCOMPLETE_CODE);
  }

  return (
    <>
      {message ? (
        <p
          id="otp-error"
          className="font-body-md text-body-md bg-error-container text-on-error-container mt-4 rounded-2xl px-3 py-2"
          role="alert"
        >
          {message}
        </p>
      ) : null}

      <form
        action={action}
        className="mt-8 flex flex-col gap-3"
        onSubmit={(event) => {
          const code = String(new FormData(event.currentTarget).get("code") ?? "");
          if (!/^\d{6}$/.test(code)) {
            event.preventDefault();
            rejectIncomplete();
          }
        }}
      >
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <label
          htmlFor="code"
          className="font-label-md text-label-md text-primary-container"
        >
          Code à 6 chiffres
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          placeholder="------"
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? "otp-error" : undefined}
          onInvalid={(event) => {
            event.preventDefault();
            rejectIncomplete();
          }}
          onPaste={(event) => {
            event.preventDefault();
            const digits = event.clipboardData
              .getData("text")
              .replace(/\D/g, "")
              .slice(0, 6);
            event.currentTarget.value = digits;
            if (clientMessage) setClientMessage(null);
          }}
          onChange={() => {
            if (clientMessage) setClientMessage(null);
          }}
          className="bg-surface-container-low font-headline-md text-headline-md text-on-surface placeholder:text-outline focus-visible:ring-primary-container h-14 w-full rounded-full border-0 px-4 text-center tracking-[0.4em] outline-none focus-visible:ring-2"
        />
        <Button type="submit" size="lg" className="w-full">
          Valider
        </Button>
      </form>
    </>
  );
}
