"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useReportAccess } from "@/hooks/use-report-access";
import { ReportAccessGate } from "@/components/report-access-gate";

type Props = {
  isKo: boolean;
  onAllowedDownload: () => void;
  children: (opts: {
    onDownloadClick: () => void;
    pdfAllowed: boolean;
    checking: boolean;
  }) => ReactNode;
};

/** PDF 다운로드 PRO 전용 — FREE는 /pricing 게이트 */
export function PlannerPdfDownloadGate({
  isKo,
  onAllowedDownload,
  children,
}: Props) {
  const { access, loading } = useReportAccess("planner_pdf");
  const [showGate, setShowGate] = useState(false);

  const onDownloadClick = useCallback(() => {
    if (access.allowed) {
      onAllowedDownload();
      return;
    }
    setShowGate(true);
  }, [access.allowed, onAllowedDownload]);

  return (
    <>
      {children({
        onDownloadClick,
        pdfAllowed: access.allowed,
        checking: loading,
      })}
      {showGate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-[#0a0a0f] bg-white p-1 shadow-xl">
            <ReportAccessGate
              access={access}
              feature="planner_pdf"
              isKo={isKo}
              gated={false}
            >
              <div />
            </ReportAccessGate>
            <div className="flex justify-end border-t dark:border-white/10 border-gray-100 p-3">
              <button
                type="button"
                onClick={() => setShowGate(false)}
                className="rounded-lg px-4 py-2 text-sm dark:text-white/70 text-gray-600 hover:bg-muted"
              >
                {isKo ? "닫기" : "Close"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
