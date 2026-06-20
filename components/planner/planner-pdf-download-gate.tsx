"use client";

import { useCallback, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import { useFeatureAccess } from "@/hooks/use-feature-access";

type Props = {
  isKo: boolean;
  onAllowedDownload: () => void;
  children: (opts: {
    onDownloadClick: () => void;
    pdfAllowed: boolean;
    checking: boolean;
  }) => ReactNode;
};

/** PDF 다운로드 PRO 전용 — entitlements `planner_pdf` 와 서버 게이트 동기 */
export function PlannerPdfDownloadGate({
  isKo: _isKo,
  onAllowedDownload,
  children,
}: Props) {
  const router = useRouter();
  const { allowed: pdfAllowed, loading: checking } =
    useFeatureAccess("planner_pdf");

  const onDownloadClick = useCallback(() => {
    if (checking) return;
    if (pdfAllowed) {
      onAllowedDownload();
      return;
    }
    router.push("/pricing");
  }, [checking, pdfAllowed, onAllowedDownload, router]);

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
