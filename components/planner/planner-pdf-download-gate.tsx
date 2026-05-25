"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import { useIsPro } from "@/hooks/use-is-pro";

type Props = {
  isKo: boolean;
  onAllowedDownload: () => void;
  children: (opts: {
    onDownloadClick: () => void;
    pdfAllowed: boolean;
    checking: boolean;
  }) => ReactNode;
};

/** PDF 다운로드 PRO 전용 — FREE는 /pricing 이동 */
export function PlannerPdfDownloadGate({
  isKo,
  onAllowedDownload,
  children,
}: Props) {
  const router = useRouter();
  const { isPro, loading } = useIsPro();

  const onDownloadClick = useCallback(() => {
    if (isPro) {
      onAllowedDownload();
      return;
    }
    router.push("/pricing");
  }, [isPro, onAllowedDownload, router]);

  return (
    <>
      {children({
        onDownloadClick,
        pdfAllowed: isPro,
        checking: loading,
      })}
    </>
  );
}
