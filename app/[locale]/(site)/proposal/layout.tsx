import type { Metadata } from "next";
import type { ReactNode } from "react";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo
    ? "AI 캠페인 제안서 | THINKAD 싱커드"
    : "AI campaign proposal | THINKAD";
  const description = isKo
    ? "브랜드·예산·매체 조건을 입력하면 싱커드 매체 DB 기반 캠페인 제안서를 자동 생성합니다."
    : "Enter brand, budget, and media criteria to generate a campaign proposal from THINKAD's catalog.";

  return {
    title,
    description,
    alternates: pageAlternates(locale, "/proposal"),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: "/proposal",
      image: { kind: "default" },
    }),
  };
}

export default function ProposalLayout({ children }: { children: ReactNode }) {
  return children;
}
