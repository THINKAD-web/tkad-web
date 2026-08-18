import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { fetchPlannerMediaCatalog } from "@/lib/public-media-catalog";
import { BriefFlowClient } from "@/components/planner/brief/brief-flow-client";

/**
 * PR-6a 통합 플래너 3단계 흐름 — 임시 검증 마운트.
 *
 * 6a/6b 동안 여기서 새 흐름을 Preview 로 확인하고, 6c 에서 `/planner` 를
 * 이 흐름으로 교체 + legacy 리다이렉트한다. 그때까지 검색 비노출.
 *
 * G-4: Step 1 은 SSR — 헤더·안내를 서버에서 렌더해 첫 페인트 본문이
 * 비어 있지 않게 한다. 인터랙티브 입력만 클라이언트.
 */

/** 매체 카탈로그는 DB 소스 유지 (`fetchPlannerMediaCatalog`) — ISR 1h */
export const revalidate = 3600;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  return {
    title: isKo
      ? "미디어 플래너 (신규 흐름 미리보기) | THINKAD"
      : "Media Planner (new flow preview) | THINKAD",
    robots: { index: false, follow: false },
  };
}

export default async function PlannerV2Page({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const { catalog } = await fetchPlannerMediaCatalog();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      {/* 서버 렌더 헤더 — 첫 페인트에 본문이 존재한다 (G-4) */}
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

      <BriefFlowClient catalog={catalog} />
    </main>
  );
}
