"use client";

import { useCallback, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { useAppToast } from "@/lib/use-toast";
import { buildFeatureGateMessage } from "@/lib/entitlements/gate-messages";
import { normalizeMediaDetailTextLocale } from "@/lib/media-i18n";

type Props = {
  locale?: string;
  /** @deprecated pass `locale` */
  isKo?: boolean;
  onAllowedDownload: () => void;
  children: (opts: {
    onDownloadClick: () => void;
    pdfAllowed: boolean;
    checking: boolean;
  }) => ReactNode;
};

/** PDF 다운로드 PRO 전용 — entitlements `planner_pdf` 와 서버 게이트 동기 */
export function PlannerPdfDownloadGate({
  locale,
  isKo,
  onAllowedDownload,
  children,
}: Props) {
  const useKo =
    locale != null
      ? normalizeMediaDetailTextLocale(locale) === "ko"
      : (isKo ?? true);
  const router = useRouter();
  const toast = useAppToast();
  const {
    allowed: pdfAllowed,
    loading: checking,
    access,
  } = useFeatureAccess("planner_pdf");

  const onDownloadClick = useCallback(() => {
    if (checking) return;
    if (pdfAllowed) {
      onAllowedDownload();
      return;
    }
    const msg = buildFeatureGateMessage({
      feature: "planner_pdf",
      access,
      isKo: useKo,
    });
    toast.show({
      variant: "warning",
      title: msg.title,
      description: msg.description,
    });
    router.push(msg.primaryCta.href);
  }, [checking, pdfAllowed, onAllowedDownload, router, access, useKo, toast]);

  return (
    <>
      {children({
        onDownloadClick,
        pdfAllowed: checking ? false : pdfAllowed,
        checking,
      })}
    </>
  );
}
