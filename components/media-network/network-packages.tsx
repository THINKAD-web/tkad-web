import { Link } from "@/i18n/navigation";
import { Check } from "lucide-react";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import {
  NETWORK_NEON_CARD,
  NETWORK_NEON_CTA,
  NETWORK_NEON_CTA_SECONDARY,
} from "@/components/media-network/network-neon-ui";
import { formatNetworkPriceWon } from "@/lib/network-media-stats";
import { cn } from "@/lib/utils";

const PACKAGES = [
  {
    id: "basic",
    nameKo: "기본 패키지",
    nameEn: "Basic",
    pointsKo: "10~20 지점",
    pointsEn: "10–20 sites",
    durationKo: "1개월",
    durationEn: "1 month",
    supportKo: "기본 서포트",
    supportEn: "Standard support",
    priceMan: 50,
    ctaKo: "이 패키지로 견적",
    ctaEn: "Quote this package",
    href: "/quote?type=network&package=basic",
    featured: false,
  },
  {
    id: "pro",
    nameKo: "프로 패키지",
    nameEn: "Pro",
    pointsKo: "30~50 지점",
    pointsEn: "30–50 sites",
    durationKo: "3개월",
    durationEn: "3 months",
    supportKo: "우선 지원",
    supportEn: "Priority support",
    priceMan: 150,
    ctaKo: "이 패키지로 견적",
    ctaEn: "Quote this package",
    href: "/quote?type=network&package=pro",
    featured: true,
  },
  {
    id: "premium",
    nameKo: "프리미엄",
    nameEn: "Premium",
    pointsKo: "50+ 지점",
    pointsEn: "50+ sites",
    durationKo: "1년",
    durationEn: "1 year",
    supportKo: "전담 담당자",
    supportEn: "Dedicated manager",
    priceMan: 300,
    priceSuffix: true,
    ctaKo: "상담 신청",
    ctaEn: "Request consultation",
    href: "/contact?topic=network-premium",
    featured: false,
  },
] as const;

type Props = { isKo: boolean };

export function NetworkPackages({ isKo }: Props) {
  return (
    <NeonSection>
      <NeonSectionHead
        number="04"
        kicker={isKo ? "PACKAGES" : "PACKAGES"}
        title={
          <>
            {isKo ? "목적별 " : "Ready-made "}
            <span className="tkad-home-accent-text">
              {isKo ? "패키지 제안" : "packages"}
            </span>
          </>
        }
        meta={
          isKo
            ? "규모에 맞는 대표 패키지로 빠르게 시작"
            : "Start fast with packages by scale"
        }
      />

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {PACKAGES.map((pkg) => (
          <article
            key={pkg.id}
            className={cn(
              NETWORK_NEON_CARD,
              "flex flex-col p-6 sm:p-7",
              pkg.featured &&
                "border-violet-500/40 bg-gradient-to-b from-violet-500/10 to-transparent shadow-[0_0_40px_rgba(139,92,246,0.12)]",
            )}
          >
            {pkg.featured ? (
              <span className="mb-3 w-fit rounded-full bg-violet-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                {isKo ? "인기" : "Popular"}
              </span>
            ) : (
              <span className="mb-3 h-5" />
            )}
            <h3 className="text-xl font-black text-gray-900 dark:text-white">
              {isKo ? pkg.nameKo : pkg.nameEn}
            </h3>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-gray-600 dark:text-white/55">
              {[pkg.pointsKo, pkg.durationKo, pkg.supportKo].map((line, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>
                    {isKo
                      ? line
                      : [pkg.pointsEn, pkg.durationEn, pkg.supportEn][i]}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 font-sans text-3xl font-bold tabular-nums tracking-normal text-gray-900 dark:text-white">
              {formatNetworkPriceWon(pkg.priceMan, isKo)}
              {"priceSuffix" in pkg && pkg.priceSuffix ? "+" : ""}
            </p>
            <Link
              href={pkg.href}
              className={cn(
                "mt-4 w-full",
                pkg.featured ? NETWORK_NEON_CTA : NETWORK_NEON_CTA_SECONDARY,
              )}
            >
              {isKo ? pkg.ctaKo : pkg.ctaEn}
            </Link>
          </article>
        ))}
      </div>
    </NeonSection>
  );
}
