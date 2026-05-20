"use client";

import { Phone } from "lucide-react";
import { useLocale } from "next-intl";
import { MediaKakaoShareButton } from "@/components/media-kakao-share-button";
import { cn } from "@/lib/utils";

const SALES_PHONE = "02-515-2772";
const SALES_TEL = "tel:02-515-2772";

type Props = {
  mediaId: string;
  mediaName: string;
  mediaType: string;
  location: string;
  imageUrl?: string;
  compact?: boolean;
  className?: string;
};

export function MediaQuickInquiryActions({
  mediaId,
  mediaName,
  mediaType,
  location,
  imageUrl,
  compact,
  className,
}: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";

  const btn = compact
    ? "min-h-10 gap-1.5 rounded-[14px] px-3 text-[11px]"
    : "min-h-11 gap-2 rounded-[15px] px-4 text-sm";

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <a
        href={SALES_TEL}
        className={cn(
          "inline-flex items-center justify-center font-bold text-white",
          btn,
          "border border-emerald-400/40 bg-emerald-500/20 hover:bg-emerald-500/30",
        )}
      >
        <Phone className="h-3.5 w-3.5 shrink-0" />
        {isKo ? "전화 문의" : "Call"}
        <span className="sr-only">{SALES_PHONE}</span>
      </a>
      <MediaKakaoShareButton
        mediaId={mediaId}
        mediaName={mediaName}
        mediaType={mediaType}
        location={location}
        imageUrl={imageUrl}
        className={cn("min-h-0 w-full justify-center normal-case", btn)}
      />
    </div>
  );
}
