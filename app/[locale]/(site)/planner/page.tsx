import { StrictMode, Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { fetchPlannerMediaCatalog } from "@/lib/public-media-catalog";
import { loadDigitalChannelsForIntegratedPlanner } from "@/lib/planner/digital-catalog-bridge";
import { BriefFlowClient } from "@/components/planner/brief/brief-flow-client";
import { SubTabsBar } from "@/components/layout/sub-tabs-bar";

/** PR-6c — 통합 3단계 플래너 (구 6단계·v2 흐름 대체) */
export const revalidate = 3600;

type Props = { params: Promise<{ locale: string }> };

export default async function PlannerPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const { catalog } = await fetchPlannerMediaCatalog();
  const digitalBridge = await loadDigitalChannelsForIntegratedPlanner();

  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl overflow-x-clip px-4 py-10">
      <header className="mx-auto mb-8 max-w-3xl border-b border-border pb-6 text-center">
        <p className="tkad-type-label text-primary">
          {isKo ? "상세 플래너 · 3단계" : "Detailed planner · 3 steps"}
        </p>
        <h1 className="tkad-type-display mt-2">
          {isKo
            ? "믹스를 편집하고 제안서까지 완성합니다"
            : "Edit the mix and finish a proposal"}
        </h1>
        <p className="tkad-type-body mt-3 text-muted-foreground">
          {isKo
            ? "예산과 기간만 필수입니다. 후보만 빠르게 보려면 AI 플래너를 쓰세요."
            : "Only budget and flight are required. Use AI Planner to explore candidates first."}
        </p>
      </header>
      <div className="-mx-4 mb-8 sm:-mx-0">
        <SubTabsBar group="planning" currentPath="/planner" />
      </div>

      <Suspense fallback={null}>
        {process.env.NODE_ENV === "development" ? (
          <StrictMode>
            <BriefFlowClient
              catalog={catalog}
              digitalChannels={digitalBridge.channels}
              digitalCatalogMeta={digitalBridge.meta}
            />
          </StrictMode>
        ) : (
          <BriefFlowClient
            catalog={catalog}
            digitalChannels={digitalBridge.channels}
            digitalCatalogMeta={digitalBridge.meta}
          />
        )}
      </Suspense>
    </main>
  );
}
