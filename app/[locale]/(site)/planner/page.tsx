import { StrictMode, Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { fetchPlannerMediaCatalog } from "@/lib/public-media-catalog";
import { loadDigitalChannelsForIntegratedPlanner } from "@/lib/planner/digital-catalog-bridge";
import { BriefFlowClient } from "@/components/planner/brief/brief-flow-client";
import { PlanningPageShell } from "@/components/layout/planning-page-shell";
import { MarketingHeroVisual } from "@/components/design/marketing-hero-visual";
import { DESIGN_MARKETING_HERO_ASSETS } from "@/lib/design-marketing-assets";

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
    <PlanningPageShell
      currentPath="/planner"
      header={
        <header className="mx-auto mb-6 max-w-3xl border-b border-border/70 pb-5 text-center">
          <MarketingHeroVisual
            src={DESIGN_MARKETING_HERO_ASSETS.plannerAiMix}
            className="mb-6 px-0"
            priority
          />
          <p className="tkad-type-label text-primary">
            {isKo ? "상세 플래너 · 3단계" : "Detailed planner · 3 steps"}
          </p>
          <h1 className="tkad-type-display mt-2">
            {isKo
              ? "AI가 최적 매체 믹스를 제안합니다"
              : "AI suggests your optimal media mix"}
          </h1>
          <p className="tkad-type-body mt-3 text-muted-foreground">
            {isKo
              ? "예산과 기간만 필수입니다. 믹스를 편집하고 제안서까지 완성하세요."
              : "Budget and flight are required. Edit the mix and finish your proposal."}
          </p>
        </header>
      }
    >
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
    </PlanningPageShell>
  );
}
