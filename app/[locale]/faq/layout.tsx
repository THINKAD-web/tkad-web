import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { defaultOgImages } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "자주 묻는 질문" : "FAQ";
  const description = isKo
    ? "OOH 광고와 싱커드 서비스에 대해 자주 묻는 질문과 답변. 광고 진행 절차, 비용, 매체 선정 기준 등."
    : "Frequently asked questions about OOH advertising and THINKAD: process, budgets, and media selection.";
  const ogTitle = isKo
    ? "자주 묻는 질문 | THINKAD 싱커드"
    : "FAQ | THINKAD";
  const ogDesc = isKo
    ? "OOH 광고와 싱커드 서비스에 대해 자주 묻는 질문과 답변."
    : "Answers about OOH and THINKAD services.";
  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      images: defaultOgImages(locale, {
        ko: "THINKAD OOH 자주 묻는 질문",
        en: "THINKAD OOH FAQ",
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDesc,
    },
  };
}

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
