"use client";

import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import type { PublicMediaPackage } from "@/lib/media-package-types";
import { PackageGridCard } from "@/components/packages/package-grid-card";
import { PageHero } from "@/components/layout/page-hero";
import { SubTabs } from "@/components/layout/sub-tabs";
import { PLANNING_TABS } from "@/lib/navigation/sub-page-tabs";

type Props = {
  packages: PublicMediaPackage[];
  isKo: boolean;
};

export function PackagesPageClient({ packages, isKo }: Props) {
  return (
    <div className="min-h-screen bg-[#F4F4F2] text-foreground transition-colors dark:bg-[#0A0A0A]">
      <PageHero
        eyebrow="// 03 · PLANNING"
        title="목적에 맞는 "
        highlight="OOH 패키지"
        description="검증된 매체 조합 패키지로 빠르게 시작하세요"
      />
      <SubTabs tabs={PLANNING_TABS} currentPath="/media/packages" />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {packages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="text-lg font-bold">
              {isKo ? "패키지를 준비 중입니다." : "Packages coming soon."}
            </p>
            <Link
              href="/planner"
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-violet-600"
            >
              {isKo ? "AI 플래너로 시작" : "Start with AI planner"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {packages.map((pkg) => (
              <PackageGridCard
                key={pkg.slug}
                pkg={pkg}
                detailLabel={isKo ? "자세히 보기" : "View details"}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
