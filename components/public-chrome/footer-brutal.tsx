"use client";

/**
 * FooterBrutal — Quiet Professional 다열 사이트맵 + 법적 필수정보.
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
import { cn } from "@/lib/utils";

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

const colTitleClass =
  "font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-900 dark:text-white";

const colLinkClass =
  "block text-xs text-gray-600 transition hover:text-[color:var(--qp-accent)] dark:text-white/65 dark:hover:text-[color:var(--qp-accent)]";

const legalLinkClass =
  "text-xs text-gray-500 transition hover:text-gray-800 dark:text-white/45 dark:hover:text-white/80";

const iconLinkClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition hover:border-[color:var(--qp-accent)]/40 hover:text-[color:var(--qp-accent)] dark:border-white/15 dark:text-white/60 dark:hover:border-[color:var(--qp-accent)]/50 dark:hover:text-[color:var(--qp-accent)]";

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

  /** 푸터 컬럼 — SEO 기타검색은 모달로만 (밀도 과다 방지) */
  const footerColumns = useMemo(
    () =>
      sitemapSections
        .filter((s) => s.id !== "other-search")
        .map((section) => ({
          ...section,
          links: section.links.slice(0, 6),
        })),
    [sitemapSections],
  );

  const onPricingPage = pathname.includes("/pricing");
  const pricingCtaHref = onPricingPage ? "/pricing#pro-upgrade" : "/pricing";

  const legalLinks = [
    { href: "/privacy", label: t("footer.privacy") },
    { href: "/terms", label: t("footer.terms") },
    { href: "/refund", label: t("footer.refund") },
    { href: "/guarantee", label: t("footer.guarantee") },
  ] as const;

  const isKo = locale.startsWith("ko");
  const mobileNavLinks = [
    { href: "/contact", label: t("footer.coreContact") },
    { href: pricingCtaHref, label: t("footer.corePricingCta") },
    { href: "/guide/how-to-use", label: isKo ? "사용 가이드" : "Usage guide" },
    { href: "/about", label: t("footer.coreAbout") },
  ] as const;

  const legalMeta = (
    <div className="space-y-0.5 text-[11px] leading-relaxed text-gray-500 dark:text-white/45">
      <p className="font-medium text-gray-700 dark:text-white/70">{t("footer.companyName")}</p>
      <p>{t("footer.ceo")}</p>
      <p>{t("footer.bizNumber")}</p>
      <p>{t("footer.ecommerce")}</p>
      <p>{t("footer.address")}</p>
      <p>
        <a
          href={`tel:${t("footer.phone").replace(/-/g, "")}`}
          className="transition hover:text-[color:var(--qp-accent)]"
        >
          {t("footer.phone")}
        </a>
        {" · "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="transition hover:text-[color:var(--qp-accent)]"
        >
          {CONTACT_EMAIL}
        </a>
      </p>
    </div>
  );

  const socialRow = (
    <div className="flex items-center gap-1.5">
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
  );

  const brandMark = (
    <Link
      href="/"
      className="inline-block font-display text-[11px] font-black uppercase tracking-[0.22em] text-gray-900 dark:text-white"
    >
      THINK
      <span className="text-[color:var(--qp-accent)]">AD</span>
    </Link>
  );

  const mobileFooter = (
    <footer
      id="site-footer"
      className="tkad-site-footer relative shrink-0 overflow-hidden border-t border-gray-200 bg-gray-50 text-gray-900 dark:border-white/10 dark:bg-[#0a0a0a] dark:text-white"
    >
      <div className="px-4 pt-5 pb-2" data-screenshot="mobile-footer">
        <div className="flex items-start justify-between gap-3">
          <div>
            {brandMark}
            <p className="mt-1.5 text-xs text-gray-600 dark:text-white/65">
              {t("footer.description")}
            </p>
          </div>
          {socialRow}
        </div>

        <nav
          aria-label={t("footer.coreNavLabel")}
          className="mt-4 flex flex-wrap gap-x-3 gap-y-2 border-t border-gray-200 pt-3 dark:border-white/10"
        >
          {mobileNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-medium text-gray-700 underline-offset-2 hover:text-[color:var(--qp-accent)] hover:underline dark:text-white/75"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={KAKAO_CHANNEL_PUBLIC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-gray-700 underline-offset-2 hover:text-[color:var(--qp-accent)] hover:underline dark:text-white/75"
          >
            {t("footer.kakaoChannel")}
          </a>
        </nav>

        <div className="mt-4 border-t border-gray-200 pt-3 dark:border-white/10">
          {legalMeta}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-center text-xs text-gray-400 dark:text-white/35">
          <span>
            © {year} {t("footer.companyNameShort")}
          </span>
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className={legalLinkClass}>
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setSitemapOpen(true)}
            className="text-xs text-gray-500 underline-offset-2 hover:text-[color:var(--qp-accent)] hover:underline dark:text-white/40"
          >
            {t("footer.sitemap")}
          </button>
        </div>
      </div>
      <div className="h-[4.25rem]" aria-hidden />
    </footer>
  );

  const desktopFooter = (
    <footer
      id="site-footer"
      className="tkad-site-footer relative shrink-0 overflow-hidden border-t border-gray-200 bg-gray-50 text-gray-900 dark:border-white/10 dark:bg-[#0a0a0a] dark:text-white"
    >
      <div className="relative mx-auto max-w-7xl px-4 py-10 md:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,2.85fr)] lg:gap-12">
          <div>
            {brandMark}
            <p className="mt-2 max-w-xs text-sm font-medium leading-snug text-gray-700 dark:text-white/75">
              {t("footer.description")}
            </p>
            <div className="mt-4">{legalMeta}</div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {socialRow}
              <Link
                href="/guide/how-to-use"
                className="text-xs font-semibold text-[color:var(--qp-accent)] underline-offset-2 hover:underline"
              >
                {t("footer.usageGuideLink")}
              </Link>
            </div>
          </div>

          <div
            className={cn(
              "grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
            )}
          >
            {footerColumns.map((col) => (
              <nav key={col.id} aria-label={col.title}>
                <p className={colTitleClass}>{col.title}</p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={`${col.id}-${link.href}-${link.label}`}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={colLinkClass}
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link href={link.href} className={colLinkClass}>
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
      </div>

      <div className="relative border-t border-gray-200 bg-white/90 px-4 py-3 dark:border-white/10 dark:bg-black/50 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 sm:flex-row sm:flex-wrap">
          <span className="text-[11px] text-gray-500 dark:text-white/45">
            {t("footer.copyrightShort", { year })}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className={legalLinkClass}>
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => setSitemapOpen(true)}
              className="rounded-md border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500 transition hover:border-[color:var(--qp-accent)]/40 hover:text-[color:var(--qp-accent)] dark:border-white/10 dark:text-white/40"
            >
              ⊞ {t("footer.sitemap")}
            </button>
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
