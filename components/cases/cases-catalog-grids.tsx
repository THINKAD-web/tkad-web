import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CaseStudyCard } from "@/components/cases/case-study-card";
import type { PublicSuccessCaseListItem } from "@/lib/success-case-public";

type Props = {
  locale: string;
  recommended: PublicSuccessCaseListItem[];
  gridCases: PublicSuccessCaseListItem[];
  showNoMatch?: boolean;
};

/** 서버에서 렌더되는 사례 카드 그리드 (SSR 본문) */
export async function CasesCatalogGrids({
  locale,
  recommended,
  gridCases,
  showNoMatch,
}: Props) {
  const t = await getTranslations({ locale, namespace: "cases" });
  const isKo = locale === "ko" || locale.startsWith("ko");

  return (
    <>
      {recommended.length > 0 ? (
        <section className="mb-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#a855f7]">
                <Sparkles className="h-3.5 w-3.5" />
                [ {t("recommendedTitle")} ]
              </p>
              <p className="mt-1 text-sm text-white/55">{t("recommendedSubtitle")}</p>
            </div>
          </div>
          <div
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            data-cases-region="recommended"
          >
            {recommended.map((cs) => (
              <div key={cs.id} data-case-card data-case-id={cs.id}>
                <CaseStudyCard item={cs} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {gridCases.length > 0 ? (
        <div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          data-cases-region="grid"
        >
          {gridCases.map((cs) => (
            <div key={cs.id} data-case-card data-case-id={cs.id}>
              <CaseStudyCard item={cs} />
            </div>
          ))}
        </div>
      ) : showNoMatch ? (
        <p className="rounded-[20px] border border-white/12 bg-white/5 py-16 text-center text-sm text-white/55">
          {isKo
            ? "선택한 필터에 맞는 사례가 없습니다. 필터를 조정해 보세요."
            : "No cases match your filters. Try adjusting them."}
        </p>
      ) : null}
    </>
  );
}
