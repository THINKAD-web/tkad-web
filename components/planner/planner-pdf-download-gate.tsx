"use client";

import { useCallback, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { useAppToast } from "@/lib/use-toast";
import { buildFeatureGateMessage } from "@/lib/entitlements/gate-messages";

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
  isKo,
  onAllowedDownload,
  children,
}: Props) {
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
      isKo,
    });
    toast.show({
      variant: "warning",
      title: msg.title,
      description: msg.description,
    });
    router.push(msg.primaryCta.href);
  }, [checking, pdfAllowed, onAllowedDownload, router, access, isKo, toast]);

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
