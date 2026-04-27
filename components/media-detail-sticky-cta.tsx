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
      <div className="pointer-events-auto mx-auto max-w-lg overflow-hidden rounded-lg border-2 border-bx-accent bg-bx-black shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b-2 border-bx-accent/30 px-3 py-1.5">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-bx-accent">
            [ MEDIA ACTIONS ]
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-bx-white/40">
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
            <span className="truncate">{t("stickyCtaCompare")}</span>
          </BtnBlock>
        </div>
      </div>
    </div>
  );
}
