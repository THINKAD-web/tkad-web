"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import type { PublicAnalyticsConfig } from "@/lib/analytics-integrations";

function buildGtmBootstrap(containerId: string): string {
  return `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${containerId}');
  `;
}

export function PublicAnalyticsLoader() {
  const pathname = usePathname();
  const [config, setConfig] = useState<PublicAnalyticsConfig | null>(null);
  const shouldLoadAnalytics =
    pathname == null ||
    !/^\/(?:ko|en)\/(?:admin|client)(?:\/|$)/.test(pathname);

  useEffect(() => {
    if (!shouldLoadAnalytics) return;

    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/analytics/config", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as PublicAnalyticsConfig;
        if (!cancelled) setConfig(data);
      } catch {
        // Ignore analytics bootstrap failures to avoid impacting page rendering.
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [shouldLoadAnalytics]);

  if (!shouldLoadAnalytics || !config) return null;

  return (
    <>
      {config.gtm ? (
        <Script id={`gtm-loader-${config.gtm.containerId}`} strategy="afterInteractive">
          {buildGtmBootstrap(config.gtm.containerId)}
        </Script>
      ) : null}

      {config.ga4 ? (
        <>
          <Script
            id={`ga4-src-${config.ga4.measurementId}`}
            src={`https://www.googletagmanager.com/gtag/js?id=${config.ga4.measurementId}`}
            strategy="afterInteractive"
          />
          <Script
            id={`ga4-config-${config.ga4.measurementId}`}
            strategy="afterInteractive"
          >
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = window.gtag || gtag;
              gtag('js', new Date());
              gtag('config', '${config.ga4.measurementId}');
            `}
          </Script>
        </>
      ) : null}
    </>
  );
}
