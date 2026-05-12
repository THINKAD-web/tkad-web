"use client";

import { useTranslations } from "next-intl";
import { BarChart3, Sparkles } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { MediaQuoteCtaButton } from "@/components/media-quote-cta";
import type { MediaItem } from "@/lib/media-data";

/**
 * #MEDIA-3: 매체 상세 모바일 하단 sticky CTA.
 * 라벨: 플래너 / 견적받기 / 비교하기 (변경 없음).
 * 디자인 개선:
 *   - 상단 모노 라벨 [ MEDIA ACTIONS ]
 *   - rounded-t-lg + 오프셋 그림자 → 부드러운 모서리 + 떠있는 느낌
 *   - 검정 배경 + 주황 보더 (브루탈리스트) + safe-area 패딩
 */
export default function MediaDetailStickyCta({
  media,
  compareHref,
}: {
  media: MediaItem;
  compareHref: string;
}) {
  const t = useTranslations("media.detail");
  const tCta = useTranslations("mediaDetail.cta");

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none"
      role="region"
      aria-label={t("stickyCtaRegionLabel")}
    >
      <div className="pointer-events-auto mx-auto max-w-lg overflow-hidden rounded-[22px] border border-white/14 bg-black/55 shadow-[0_-10px_60px_-20px_rgba(0,0,0,0.75)] backdrop-blur">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-25 tkad-neon-grid"
        />
        <div className="relative flex items-center justify-between border-b border-white/10 px-3 py-2">
          <span className="font-mono text-[9px] font-black uppercase tracking-[0.28em] text-white/80">
            [ MEDIA ACTIONS ]
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/45">
            {`// `}3 OPTIONS
          </span>
        </div>
        <div className="flex gap-2 p-2 sm:gap-3 sm:p-3">
          <BtnBlock
            href={`/planner?addMedia=${encodeURIComponent(media.id)}`}
            variant="accent"
            size="sm"
            className="min-w-0 flex-1"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{tCta("plannerShort")}</span>
          </BtnBlock>
          <div className="min-w-0 flex-1">
            <MediaQuoteCtaButton media={media} variant="sticky" />
          </div>
          <BtnBlock
            href={compareHref}
            variant="secondary"
            size="sm"
            className="min-w-0 flex-1"
          >
            <BarChart3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 truncate text-center">
              <span className="sm:hidden">{tCta("compareShort")}</span>
              <span className="hidden sm:inline">{t("stickyCtaCompare")}</span>
            </span>
          </BtnBlock>
        </div>
      </div>
    </div>
  );
}
