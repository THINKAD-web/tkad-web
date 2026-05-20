"use client";

import { MessageCircle } from "lucide-react";
import { useLocale } from "next-intl";
import { useAppToast } from "@/lib/use-toast";
import {
  isKakaoShareAvailable,
  shareMediaViaKakao,
} from "@/lib/kakao-link-share";
import { getClientSiteUrl } from "@/lib/site-url-client";
import { cn } from "@/lib/utils";

type Props = {
  mediaId: string;
  mediaName: string;
  mediaType: string;
  location: string;
  imageUrl?: string;
  className?: string;
};

export function MediaKakaoShareButton({
  mediaId,
  mediaName,
  mediaType,
  location,
  imageUrl,
  className,
}: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const toast = useAppToast();

  const share = async () => {
    if (!isKakaoShareAvailable()) {
      toast.warning(
        isKo
          ? "카카오 공유 키가 설정되지 않았습니다."
          : "Kakao share is not configured.",
      );
      return;
    }
    const base = getClientSiteUrl();
    const pageUrl =
      typeof window !== "undefined"
        ? window.location.href
        : `${base}/${locale}/media/${mediaId}`;
    try {
      await shareMediaViaKakao({
        title: mediaName,
        description: [location, mediaType].filter(Boolean).join(" · "),
        imageUrl: imageUrl || `${base}/icons/icon-512.png`,
        pageUrl,
      });
    } catch {
      toast.error(isKo ? "카카오 공유 실패" : "Kakao share failed");
    }
  };

  return (
    <button
      type="button"
      onClick={() => void share()}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-[#FEE500]/50 bg-[#FEE500]/15 px-3 py-2 text-xs font-bold uppercase tracking-wider text-yellow-100 transition hover:bg-[#FEE500]/25",
        className,
      )}
    >
      <MessageCircle className="h-3.5 w-3.5" />
      {isKo ? "카카오로 공유" : "Share on Kakao"}
    </button>
  );
}
