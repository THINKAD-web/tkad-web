"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { GitCompare, ArrowLeft, FileDown } from "lucide-react";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
import { type MediaItem } from "@/lib/media-data";
import { MediaCatalogGridCard } from "@/components/media-catalog-grid-card";
import { CompareSpecTable } from "@/components/compare-spec-table";

export default function ComparePageClient({ items }: { items: MediaItem[] }) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const tMedia = useTranslations("media");

  if (items.length < 2) {
    return (
      <section className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <GitCompare className="mb-4 h-16 w-16 text-navy/15" aria-hidden />
        <h1 className="text-2xl font-bold text-navy">
          {isKo ? "비교할 매체를 선택해주세요" : "Select media to compare"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isKo
            ? `매체 검색에서 2~${COMPARE_MAX_ITEMS}개의 매체를 선택하세요`
            : `Select 2–${COMPARE_MAX_ITEMS} media from the media search page`}
        </p>
        <Link href="/media" className="mt-6">
          <Button className="rounded-full bg-gold px-6 font-bold text-navy hover:bg-gold-dark">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isKo ? "매체 검색으로" : "Go to Media Search"}
          </Button>
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="bg-navy py-24 md:py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            {isKo ? "매체 비교" : "Media Comparison"}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-slate-300">
            {isKo
              ? `선택한 매체를 매체 검색과 같은 카드로 확인하고, 견적·PDF로 이어갈 수 있습니다. (최대 ${COMPARE_MAX_ITEMS}개)`
              : `Review selected media in the same cards as Media Search, then request a quote or PDF (up to ${COMPARE_MAX_ITEMS}).`}
          </p>
        </div>
      </section>

      <section className="bg-gradient-to-b from-slate-50/90 via-white to-slate-50/50 py-12 md:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 md:mb-10">
            <Link href="/media">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <ArrowLeft className="mr-1 h-4 w-4" />
                {isKo ? "매체 검색으로 돌아가기" : "Back to Media Search"}
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((media) => (
              <MediaCatalogGridCard
                key={media.id}
                variant="link"
                media={media}
                isKo={isKo}
                imagePreparingLabel={tMedia("imagePreparing")}
              />
            ))}
          </div>

          <CompareSpecTable items={items} isKo={isKo} />

          <div className="mt-14 flex flex-col items-stretch gap-4 sm:mt-16 sm:items-center md:gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:justify-center">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full bg-navy px-8 font-bold text-white shadow-md hover:bg-navy-light"
              >
                <Link
                  href={`/quote?media=${items.map((m) => m.id).join(",")}`}
                >
                  {isKo ? "견적 요청" : "Request a quote"}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-2 border-gold/50 px-8 font-bold text-navy hover:bg-gold/10"
              >
                <a
                  href={`/api/compare/pdf?ids=${items.map((m) => encodeURIComponent(m.id)).join(",")}${isKo ? "" : "&lang=en"}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  {isKo ? "PDF 다운로드" : "Download PDF"}
                </a>
              </Button>
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              {isKo
                ? "견적 요청 시 위에서 비교 중인 매체가 모두 선택된 상태로 이동합니다."
                : "Quote opens with all media you are comparing pre-selected."}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
