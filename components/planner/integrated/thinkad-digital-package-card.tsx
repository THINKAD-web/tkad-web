"use client";

import { ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

/** Fixed list prices — not CPC/CPM estimates; not part of DIGITAL_CHANNELS. */
const THINKAD_DIGITAL_PACKAGES = [
  { tier: "BASIC", priceWon: 990_000 },
  { tier: "PRO", priceWon: 2_490_000 },
  { tier: "PREMIUM", priceWon: 4_990_000 },
] as const;

const PRICING_URL = "https://digital.tkad.co.kr/pricing";
const CONTACT_URL = "https://digital.tkad.co.kr/contact";

function formatWon(n: number, isKo: boolean) {
  return `₩${n.toLocaleString(isKo ? "ko-KR" : "en-US")}`;
}

/**
 * Informational cross-sell only. Must not feed recommendDigitalChannels,
 * DIGITAL_CHANNELS, or digitalBudgetPct.
 */
export function ThinkadDigitalPackageCard() {
  const t = useTranslations("plannerIntegrated");
  const locale = useLocale();
  const isKo = locale === "ko" || locale.startsWith("ko-");

  return (
    <aside
      data-testid="thinkad-digital-package-card"
      aria-label={t("thinkadDigitalCardAria")}
      className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/80 p-5 sm:p-6 dark:border-white/15 dark:bg-white/[0.03]"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("thinkadDigitalCardEyebrow")}
      </p>
      <h3 className="mt-1 text-base font-bold text-foreground dark:text-white">
        {t("thinkadDigitalCardTitle")}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("thinkadDigitalCardDesc")}
      </p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {THINKAD_DIGITAL_PACKAGES.map((p) => (
          <li
            key={p.tier}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-white/5"
          >
            <p className="text-xs font-bold text-foreground dark:text-white">
              {p.tier}
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground dark:text-white">
              {formatWon(p.priceWon, isKo)}
              <span className="text-xs font-medium text-muted-foreground">
                {t("thinkadDigitalPerMonth")}
              </span>
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-muted-foreground">
        {t("thinkadDigitalCardNote")}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={PRICING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-3.5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 dark:bg-white dark:text-gray-900"
        >
          {t("thinkadDigitalPricingCta")}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
        <a
          href={CONTACT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-transparent px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-white/60 dark:border-white/20 dark:hover:bg-white/10"
        >
          {t("thinkadDigitalContactCta")}
        </a>
      </div>
    </aside>
  );
}
