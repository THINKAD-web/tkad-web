"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BarChart3, Bolt, Sparkles } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { ChatStartButton } from "@/components/chat/chat-start-button";
import { MediaQuickInquiryActions } from "@/components/media-quick-inquiry-actions";
import type { MediaItem } from "@/lib/media-data";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import { getPrimaryMediaImageUrl } from "@/lib/media-data";
import { cn } from "@/lib/utils";

export default function MediaDetailStickyCta({
  media,
  compareHref,
  instantBookEligible = false,
  hideWhenNearSimilar = true,
}: {
  media: MediaItem;
  compareHref: string;
  instantBookEligible?: boolean;
  /** 모바일: SIMILAR MEDIA 섹션에 가까우면 바 숨김 */
  hideWhenNearSimilar?: boolean;
}) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const t = useTranslations("media.detail");
  const tCta = useTranslations("mediaDetail.cta");
  const displayName = isKo ? media.name : media.nameEn || media.name;
  const heroImage = getPrimaryMediaImageUrl(media);
  const location = formatMediaLocationShort(media, isKo);
  const [hidden, setHidden] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!hideWhenNearSimilar) return;
    const target = document.getElementById("media-similar-section");
    if (!target) return;

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        setHidden(entry.isIntersecting);
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    observerRef.current.observe(target);
    return () => observerRef.current?.disconnect();
  }, [hideWhenNearSimilar, media.id]);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-50 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 transition-opacity duration-300 sm:px-3 sm:pb-[max(0.65rem,env(safe-area-inset-bottom))] md:hidden",
        hidden && "opacity-0",
      )}
      role="region"
      aria-label={t("stickyCtaRegionLabel")}
      aria-hidden={hidden}
    >
      <div className="pointer-events-auto mx-auto max-w-lg overflow-hidden rounded-[18px] border dark:border-white/14 border-gray-200 dark:bg-black bg-white/55 shadow-[0_-8px_40px_-16px_rgba(0,0,0,0.75)] backdrop-blur">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-25 tkad-neon-grid"
        />
        <div className="relative space-y-1 p-2 sm:p-2.5">
          <p className="truncate px-0.5 text-xs font-bold leading-snug dark:text-white text-gray-900 dark:text-gray-100 sm:text-sm">
            {displayName}
          </p>
          <MediaQuickInquiryActions
            mediaId={media.id}
            mediaName={displayName}
            mediaType={media.type}
            location={location}
            imageUrl={heroImage || undefined}
            compact
          />
          <ChatStartButton
            mediaId={media.id}
            variant="primary"
            size="sm"
            className="min-h-10 w-full justify-center rounded-[12px] border-0 bg-gradient-to-r from-violet-500 to-cyan-400 text-xs font-black tracking-[0.04em] dark:text-white text-gray-900 shadow-lg shadow-violet-500/30 hover:opacity-95 sm:min-h-10 sm:text-sm"
          />
          {instantBookEligible ? (
            <BtnBlock
              href={`/media/${encodeURIComponent(media.id)}/book`}
              variant="secondary"
              size="sm"
              className="min-h-10 w-full justify-center rounded-[12px] dark:border-white/14 border-gray-200 dark:bg-white/8 bg-gray-100 px-2 text-sm tracking-[0.04em] dark:text-white text-gray-800 dark:text-gray-100 text-gray-900 backdrop-blur hover:bg-white/12 hover:dark:text-white"
            >
              <Bolt className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {tCta("instantBook")}
            </BtnBlock>
          ) : null}
          <div className="grid grid-cols-2 gap-1.5">
            <BtnBlock
              href={`/planner?addMedia=${encodeURIComponent(media.id)}`}
              variant="secondary"
              size="sm"
              className="min-h-10 min-w-0 justify-center rounded-[12px] dark:border-white/14 border-gray-200 dark:bg-white/8 bg-gray-100 px-2 text-sm tracking-[0.04em] dark:text-white text-gray-800 dark:text-gray-100 text-gray-900 backdrop-blur hover:bg-white/12 hover:dark:text-white"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{tCta("plannerShort")}</span>
            </BtnBlock>
            <BtnBlock
              href={compareHref}
              variant="secondary"
              size="sm"
              className="min-h-10 min-w-0 justify-center rounded-[12px] dark:border-white/14 border-gray-200 dark:bg-white/8 bg-gray-100 px-2 text-sm tracking-[0.04em] dark:text-white text-gray-800 dark:text-gray-100 text-gray-900 backdrop-blur hover:bg-white/12 hover:dark:text-white"
            >
              <BarChart3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 truncate text-center">
                {t("stickyCtaCompare")}
              </span>
            </BtnBlock>
          </div>
        </div>
      </div>
    </div>
  );
}
