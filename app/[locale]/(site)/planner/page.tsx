import type { Metadata } from "next";
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { fetchPlannerMediaCatalog } from "@/lib/public-media-catalog";
import { BriefFlowClient } from "@/components/planner/brief/brief-flow-client";

/** PR-6c — 통합 3단계 플래너 (구 6단계·v2 흐름 대체) */
export const revalidate = 3600;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  return {
    title: isKo
      ? "미디어 플래너 | THINKAD"
      : "Media Planner | THINKAD",
    description: isKo
      ? "브리프 → 믹스 → 결과, 3단계로 캠페인 플랜을 만듭니다."
      : "Brief → mix → result — build a campaign plan in three steps.",
  };
}

export default async function PlannerPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const { catalog } = await fetchPlannerMediaCatalog();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <header className="mx-auto mb-8 max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {isKo ? "미디어 플래너 · 3단계" : "Media Planner · 3 steps"}
        </p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
          {isKo
            ? "브리프만 적으면 매체 믹스가 나옵니다"
            : "Write a brief, get a media mix"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {isKo
            ? "예산과 기간만 필수입니다. 나머지는 전국·전 타깃 기준으로 자동 진행됩니다."
            : "Only budget and flight are required. The rest defaults to nationwide, all audiences."}
        </p>
      </header>

      <Suspense fallback={null}>
        <BriefFlowClient catalog={catalog} />
      </Suspense>
    </main>
  );
}
