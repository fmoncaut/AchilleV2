import type { ReactNode } from "react";

import { ConsentBanner } from "@/components/consent-banner";
import { PwaRegister } from "@/components/pwa-register";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/toaster";
import type { AnalyticsConfig } from "@/lib/analytics";

function AppShell({
  children,
  analytics,
}: {
  children: ReactNode;
  analytics: AnalyticsConfig | null;
}) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
      <ConsentBanner analytics={analytics} />
      <Toaster />
      <PwaRegister />
    </>
  );
}

export { AppShell };
