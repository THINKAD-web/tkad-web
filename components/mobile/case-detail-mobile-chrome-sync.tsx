"use client";

import { useEffect, useMemo } from "react";
import { Flag, Share2 } from "lucide-react";
import { useLocale } from "next-intl";
import { useMobileDetailChromeOptional } from "@/components/mobile/mobile-detail-chrome-context";
import type { ActionSheetItem } from "@/components/mobile/action-sheet";
import { useAppToast } from "@/lib/use-toast";

type Props = {
  title: string;
  shareDescription: string;
};

export function CaseDetailMobileChromeSync({ title, shareDescription }: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const toast = useAppToast();
  const detailChrome = useMobileDetailChromeOptional();

  const sheetItems = useMemo((): ActionSheetItem[] => {
    const shareUrl =
      typeof window !== "undefined" ? window.location.href : `/${locale}/cases`;

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
    ];
  }, [isKo, locale, shareDescription, title, toast]);

  useEffect(() => {
    if (!detailChrome) return;
    detailChrome.setDetailChrome({ title, sheetItems });
    return () => detailChrome.clearDetailChrome();
  }, [detailChrome, sheetItems, title]);

  return null;
}
