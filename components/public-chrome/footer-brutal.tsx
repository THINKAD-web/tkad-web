"use client";

/**
 * FooterBrutal — 간소화된 3컬럼 푸터 + 사이트맵 풀스크린 모달.
 */

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";
import { CONTACT_EMAIL } from "@/lib/constants";
import { buildPublicNavGroups } from "@/lib/navigation/build-public-nav";
import { buildSitemapSections } from "@/lib/navigation/sitemap-sections";
import { SitemapModal } from "@/components/public-chrome/sitemap-modal";
import { useMediaMinWidth } from "@/lib/use-media-min-width";
const INSTAGRAM_URL = "https://www.instagram.com/thinkad_korea" as const;

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function KakaoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 3C6.477 3 2 6.463 2 10.714c0 2.742 1.816 5.145 4.545 6.553-.188.688-.682 2.493-.782 2.867-.122.455.168.449.354.327.146-.095 2.307-1.563 3.242-2.2.512.074 1.04.113 1.579.113 5.523 0 10-3.463 10-7.714C21 6.463 16.523 3 12 3z" />
    </svg>
  );
}

const coreLinkClass =
  "text-xs font-medium text-gray-600 transition hover:text-gray-900 dark:text-white/70 dark:hover:text-white";

const legalLinkClass =
  "text-xs text-gray-500 transition hover:text-gray-700 dark:text-white/50 dark:hover:text-white/80";

const iconLinkClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-gray-300 hover:text-gray-900 dark:border-white/15 dark:text-white/60 dark:hover:border-white/25 dark:hover:text-white";

export function FooterBrutal() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const isMdUp = useMediaMinWidth(768);
  const [sitemapOpen, setSitemapOpen] = useState(false);
  const year = new Date().getFullYear();

  const navGroups = useMemo(() => buildPublicNavGroups(t), [t]);

  const sitemapSections = useMemo(() => {
    const byId = (id: (typeof navGroups)[number]["id"]) => {
      const group = navGroups.find((g) => g.id === id);
      if (!group) throw new Error(`Missing nav group: ${id}`);
      return group;
    };

    return buildSitemapSections({
      locale,
      discovery: byId("discovery"),
      planning: byId("planning"),
      studio: byId("studio"),
      insights: byId("insights"),
      industryGuideLabel: t("footer.industryGuide"),
      companyTitle: t("footer.sitemapCompany"),
      otherSearchTitle: t("footer.sitemapOtherSearch"),
      servicesLabel: t("footer.servicesIntro"),
      mediaRegisterLabel: t("footer.mediaPartnerRegister"),
      contactLabel: t("nav.contact"),
    });
  }, [locale, navGroups, t]);

  const onPricingPage = pathname.includes("/pricing");
  const pricingCtaHref = onPricingPage ? "/pricing#pro-upgrade" : "/pricing";

  const coreLinks = useMemo(
    () => [
      { href: "/about", label: t("footer.coreAbout") },
      { href: "/points", label: t("footer.corePointsShop") },
      { href: pricingCtaHref, label: t("footer.corePricingCta") },
      { href: "/register/media", label: t("footer.mediaPartnerRegister") },
      { href: "/developers", label: t("footer.coreDeveloperApi") },
    ],
    [pricingCtaHref, t],
  );

  const legalLinks = [
    { href: "/privacy", label: t("footer.privacy") },
    { href: "/terms", label: t("footer.terms") },
    { href: "/refund", label: t("footer.refund") },
    { href: "/guarantee", label: t("footer.guarantee") },
  ] as const;

  const mobileLegalLinks = legalLinks.filter(
    (link) => link.href !== "/guarantee",
  );

  const mobileLinkClass =
    "transition-colors hover:text-gray-600 dark:hover:text-white/50";

  const mobileFooter = (
    <footer
      id="site-footer"
      className="tkad-site-footer relative shrink-0 overflow-hidden border-t border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
    >
      <div
        className="border-t border-gray-200 dark:border-gray-800"
        data-screenshot="mobile-footer"
      >
        <div className="px-4 pt-4 text-center text-xs text-gray-400 dark:text-white/30">
          <p>
            © {year} {t("footer.companyNameShort")} · 사업자번호 319-86-00382
          </p>
          <p className="mt-1.5">
            {mobileLegalLinks.map((link, index) => (
              <span key={link.href}>
                {index > 0 ? (
                  <span className="mx-1.5" aria-hidden>
                    ·
                  </span>
                ) : null}
                <Link href={link.href} className={mobileLinkClass}>
                  {link.label}
                </Link>
              </span>
            ))}
          </p>
        </div>
        <div className="h-[4.25rem]" aria-hidden />
      </div>
    </footer>
  );

  const desktopFooter = (
    <footer
      id="site-footer"
      className="tkad-site-footer relative shrink-0 overflow-hidden border-t border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
    >
      <div
        aria-hidden
        className="absolute inset-0 hidden dark:block tkad-neon-depth"
      />
      <div
        aria-hidden
        className="absolute inset-0 hidden opacity-15 dark:block tkad-neon-grid"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <div className="grid grid-cols-3 items-start gap-6 lg:gap-8">
          <div>
            <Link
              href="/"
              className="inline-block font-display text-[11px] font-black uppercase tracking-[0.22em] text-gray-900 dark:text-white"
            >
              THINK
              <span className="bg-[linear-gradient(135deg,#a855f7_0%,#22d3ee_55%,#ec4899_100%)] bg-clip-text text-transparent">
                AD
              </span>
            </Link>
            <p className="mt-1.5 text-xs font-medium leading-snug text-gray-700 dark:text-white/80">
              {t("footer.description")}
            </p>
            <p className="mt-1 text-[10px] text-gray-500 dark:text-white/45">
              {t("footer.bizNumber")}
            </p>
          </div>

          <nav
            aria-label={t("footer.coreNavLabel")}
            className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1.5 text-center"
          >
            {coreLinks.map((link, index) => (
              <span key={link.href} className="inline-flex items-center">
                {index > 0 ? (
                  <span
                    className="mx-2 text-gray-300 dark:text-white/20"
                    aria-hidden
                  >
                    ·
                  </span>
                ) : null}
                <Link href={link.href} className={coreLinkClass}>
                  {link.label}
                </Link>
              </span>
            ))}
          </nav>

          <div className="text-right">
            <ul className="space-y-0.5 text-xs text-gray-600 dark:text-white/70">
              <li>
                <a
                  href={`tel:${t("footer.phone").replace(/-/g, "")}`}
                  className="transition hover:text-gray-900 dark:hover:text-white"
                >
                  {t("footer.phone")}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="transition hover:text-gray-900 dark:hover:text-white"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
            <div className="mt-2 flex justify-end gap-1.5">
              <a
                href={KAKAO_CHANNEL_PUBLIC_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={iconLinkClass}
                aria-label={t("footer.kakaoChannel")}
              >
                <KakaoIcon className="h-3.5 w-3.5" />
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={iconLinkClass}
                aria-label="Instagram"
              >
                <InstagramIcon className="h-3.5 w-3.5" />
              </a>
            </div>
            <p className="mt-2 text-right">
              <Link href="/guide/how-to-use" className="tkad-neon-guide-link text-[11px]">
                {t("footer.usageGuideLink")}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="relative border-t border-gray-200 bg-white/80 px-4 py-2.5 backdrop-blur dark:border-gray-800 dark:bg-black/40 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
            <span className="text-[11px] text-gray-500 dark:text-white/50">
              {t("footer.copyrightShort", { year })}
            </span>
            <span className="hidden text-gray-300 dark:text-white/20 sm:inline" aria-hidden>
              ·
            </span>
            <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
              {legalLinks.map((link) => (
                <Link key={link.href} href={link.href} className={legalLinkClass}>
                  {link.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => setSitemapOpen(true)}
                className="rounded-md border border-gray-200 px-2 py-0.5 text-[11px] text-gray-400 transition hover:text-gray-700 dark:border-white/10 dark:text-white/40 dark:hover:text-white"
              >
                ⊞ {t("footer.sitemap")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );

  return (
    <>
      {isMdUp ? desktopFooter : mobileFooter}

      <SitemapModal
        open={sitemapOpen}
        onClose={() => setSitemapOpen(false)}
        sections={sitemapSections}
        closeLabel={t("footer.sitemapClose")}
        dialogLabel={t("footer.sitemap")}
      />
    </>
  );
}
