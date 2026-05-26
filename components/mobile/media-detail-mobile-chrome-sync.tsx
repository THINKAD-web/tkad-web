"use client";

import { useEffect, useMemo } from "react";
import { Flag, Heart, Share2 } from "lucide-react";
import { useLocale } from "next-intl";
import { useMobileDetailChromeOptional } from "@/components/mobile/mobile-detail-chrome-context";
import type { ActionSheetItem } from "@/components/mobile/action-sheet";
import { useAppToast } from "@/lib/use-toast";
import { isKakaoShareAvailable, shareMediaViaKakao } from "@/lib/kakao-link-share";

type Props = {
  mediaId: string;
  title: string;
  shareDescription: string;
  imageUrl?: string;
};

/** Registers media detail action sheet items with the mobile sticky header. */
export function MediaDetailMobileChromeSync({
  mediaId,
  title,
  shareDescription,
  imageUrl,
}: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const toast = useAppToast();
  const detailChrome = useMobileDetailChromeOptional();
  const setDetailChrome = detailChrome?.setDetailChrome;
  const clearDetailChrome = detailChrome?.clearDetailChrome;

  const sheetItems = useMemo((): ActionSheetItem[] => {
    const shareUrl =
      typeof window !== "undefined"
        ? window.location.href
        : `/${locale}/media/${mediaId}`;

    return [
      {
        id: "share",
        label: isKo ? "공유하기" : "Share",
        icon: <Share2 className="h-4 w-4" aria-hidden />,
        onSelect: () => {
          void (async () => {
            if (typeof navigator !== "undefined" && navigator.share) {
              try {
                await navigator.share({
                  title,
                  text: shareDescription,
                  url: shareUrl,
                });
                return;
              } catch {
                /* cancelled */
              }
            }
            if (isKakaoShareAvailable()) {
              try {
                await shareMediaViaKakao({
                  title,
                  description: shareDescription,
                  imageUrl: imageUrl ?? `${window.location.origin}/icons/icon-512.png`,
                  pageUrl: shareUrl,
                });
                return;
              } catch {
                /* fall through */
              }
            }
            try {
              await navigator.clipboard.writeText(shareUrl);
              toast.success(isKo ? "링크가 복사되었습니다." : "Link copied.");
            } catch {
              toast.error(isKo ? "공유에 실패했습니다." : "Share failed.");
            }
          })();
        },
      },
      {
        id: "report",
        label: isKo ? "신고하기" : "Report",
        icon: <Flag className="h-4 w-4" aria-hidden />,
        destructive: true,
        onSelect: () => {
          toast.warning(isKo ? "문의 페이지에서 신고해 주세요." : "Please report via contact.");
        },
      },
      {
        id: "favorite",
        label: isKo ? "즐겨찾기 추가" : "Add to favorites",
        icon: <Heart className="h-4 w-4" aria-hidden />,
        onSelect: () => {
          document
            .querySelector<HTMLButtonElement>(`[data-media-favorite-id="${mediaId}"]`)
            ?.click();
        },
      },
    ];
  }, [imageUrl, isKo, locale, mediaId, shareDescription, title, toast]);

  useEffect(() => {
    if (!setDetailChrome) return;
    setDetailChrome({ title, sheetItems });
  }, [setDetailChrome, sheetItems, title]);

  useEffect(() => {
    if (!clearDetailChrome) return;
    return () => clearDetailChrome();
  }, [clearDetailChrome]);

  return null;
}
