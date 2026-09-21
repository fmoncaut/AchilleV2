"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import type { AnalyticsConfig } from "@/lib/analytics";
import {
  readConsentFromDocument,
  writeConsentCookie,
  type ConsentChoice,
} from "@/lib/consent";

type ConsentBannerProps = {
  analytics: AnalyticsConfig | null;
};

type ConsentSnapshot = ConsentChoice | "missing";

const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getSnapshot(): ConsentSnapshot {
  return readConsentFromDocument() ?? "missing";
}

function getServerSnapshot(): ConsentSnapshot {
  return "missing";
}

function emitConsentChange() {
  for (const listener of listeners) {
    listener();
  }
}

function AnalyticsScripts({
  config,
  enabled,
}: {
  config: AnalyticsConfig;
  enabled: boolean;
}) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (config.provider === "plausible") {
      if (document.querySelector("script[data-achille-analytics='plausible']")) {
        return;
      }
      const script = document.createElement("script");
      script.defer = true;
      script.setAttribute("data-domain", config.domain);
      script.setAttribute("data-achille-analytics", "plausible");
      script.src = config.src;
      document.head.appendChild(script);
      return;
    }

    if (document.querySelector("script[data-achille-analytics='matomo']")) {
      return;
    }

    const w = window as Window & { _paq?: unknown[] };
    w._paq = w._paq || [];
    w._paq.push(["trackPageView"]);
    w._paq.push(["enableLinkTracking"]);
    w._paq.push(["setTrackerUrl", `${config.url}/matomo.php`]);
    w._paq.push(["setSiteId", config.siteId]);

    const script = document.createElement("script");
    script.async = true;
    script.src = `${config.url}/matomo.js`;
    script.setAttribute("data-achille-analytics", "matomo");
    document.head.appendChild(script);
  }, [config, enabled]);

  return null;
}

export function ConsentBanner({ analytics }: ConsentBannerProps) {
  const stored = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const choice = stored === "missing" ? null : stored;

  function accept(next: ConsentChoice) {
    writeConsentCookie(next);
    emitConsentChange();
  }

  const showAnalytics = Boolean(analytics) && choice === "all";

  return (
    <>
      {analytics ? (
        <AnalyticsScripts config={analytics} enabled={showAnalytics} />
      ) : null}
      {choice === null ? (
        <div
          role="dialog"
          aria-labelledby="consent-title"
          className="bg-surface-container-lowest shadow-navy fixed inset-x-0 bottom-0 z-50 mx-auto max-w-3xl p-4 sm:bottom-4 sm:rounded-2xl"
        >
          <h2
            id="consent-title"
            className="font-headline-sm text-headline-sm text-primary-container"
          >
            Cookies et mesure
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
            Achille pose un cookie technique <strong>anonId</strong> (1 an,
            httpOnly) pour attribuer les renvois vers les marchands, sans vous
            identifier. Session de connexion : cookie Auth.js.
            {analytics
              ? " La mesure d’audience (Plausible ou Matomo, hébergée en UE) n’est chargée que si vous acceptez."
              : " Aucune mesure d’audience n’est configurée pour le moment."}
          </p>
          <p className="mt-2">
            <Link
              href="/confidentialite"
              className="font-label-md text-primary-container font-bold underline-offset-4 hover:underline"
            >
              Politique de confidentialité
            </Link>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {analytics ? (
              <>
                <Button type="button" onClick={() => accept("all")}>
                  Accepter la mesure
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => accept("essential")}
                >
                  Cookies techniques seulement
                </Button>
              </>
            ) : (
              <Button type="button" onClick={() => accept("essential")}>
                J’ai compris
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
