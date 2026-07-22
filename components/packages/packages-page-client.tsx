"use client";

import { Link } from "@/i18n/navigation";
import { ArrowRight, Package, Target } from "lucide-react";
import type { PublicMediaPackage } from "@/lib/media-package-types";
import type { MediaLandingPreview } from "@/lib/media-landing-previews";
import { PackageGridCard } from "@/components/packages/package-grid-card";
import { PageHero } from "@/components/layout/page-hero";
import { SubTabs } from "@/components/layout/sub-tabs";
import { PLANNING_TABS } from "@/lib/navigation/sub-page-tabs";
import { BtnBlock } from "@/components/brutalist";

type Props = {
  packages: PublicMediaPackage[];
  previews: Record<string, MediaLandingPreview>;
  isKo: boolean;
  verifiedCountLabel: string;
};

export function PackagesPageClient({
  packages,
  previews,
  isKo,
  verifiedCountLabel,
}: Props) {
  return (
    <div className="tkad-landing-neon tkad-planner-neon tkad-media-page min-w-0">
      <PageHero
        eyebrow="// 03 · PLANNING"
        title={isKo ? "목적에 맞는 " : "Curated "}
        highlight={isKo ? "OOH 패키지" : "OOH packages"}
        description={
          isKo
            ? `전국 ${verifiedCountLabel} 검증 매체에서 목적·상권별로 묶은 큐레이션. 필터 매칭 건수를 보고 바로 상세로 들어가세요.`
            : `Curated packs from ${verifiedCountLabel} verified placements — see live match counts, then open a pack.`
        }
      />
      <SubTabs tabs={PLANNING_TABS} currentPath="/media/packages" />

      <section className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col gap-3 border border-border/70 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-4 dark:bg-white/[0.03]">
          <div className="min-w-0 space-y-1">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isKo
                ? "여기는 미리 짜 둔 조합으로 견적까지 이어가는 곳입니다. 목적만 골라 탐색하려면 캠페인 목적별 매체를 쓰세요."
                : "These are curated bundles for quoting. To browse by goal only, use Campaign targets."}
            </p>
          </div>
          <Link
            href="/media/targets"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-[color:var(--qp-accent)] underline-offset-2 transition-colors hover:underline"
          >
            <Target className="h-3.5 w-3.5" aria-hidden />
            {isKo ? "캠페인 목적별 매체" : "Browse by campaign goal"}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {packages.length === 0 ? (
          <div className="border-2 border-dashed border-border bg-card p-12 text-center">
            <Package className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="mt-3 text-lg font-bold">
              {isKo ? "패키지를 준비 중입니다." : "Packages coming soon."}
            </p>
            <BtnBlock href="/planner" variant="accent" size="md" className="mt-4">
              {isKo ? "AI 플래너로 시작" : "Start with AI planner"}
              <ArrowRight className="h-4 w-4" />
            </BtnBlock>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {packages.map((pkg) => (
              <PackageGridCard
                key={pkg.slug}
                pkg={pkg}
                preview={previews[pkg.slug]}
                detailLabel={isKo ? "자세히 보기" : "View details"}
                matchLabel={(n) =>
                  isKo ? `매칭 ${n.toLocaleString("ko-KR")}건` : `${n.toLocaleString("en-US")} matches`
                }
              />
            ))}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {isKo
            ? "매칭 건수는 패키지 필터(지역·유형·타깃·예산)로 활성 카탈로그를 조회한 결과입니다."
            : "Match counts use each pack’s region, type, target, and budget filters on the live catalog."}
        </p>
      </section>
    </div>
  );
}
