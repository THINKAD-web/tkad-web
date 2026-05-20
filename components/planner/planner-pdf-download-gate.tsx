"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { useReportAccess } from "@/hooks/use-report-access";
import { ReportAccessGate } from "@/components/report-access-gate";

type Props = {
  isKo: boolean;
  onAllowedDownload: () => void;
  userEmail: string;
  children: (opts: {
    onDownloadClick: () => void;
    pdfAllowed: boolean;
    checking: boolean;
  }) => ReactNode;
};

/** PDF 다운로드 PRO 게이트 + 1회 무료(이메일) */
export function PlannerPdfDownloadGate({
  isKo,
  onAllowedDownload,
  userEmail,
  children,
}: Props) {
  const { access, loading } = useReportAccess("planner_pdf");
  const [freeLeft, setFreeLeft] = useState(false);
  const [showGate, setShowGate] = useState(false);

  useEffect(() => {
    if (access.allowed) return;
    void fetch("/api/report-access?feature=planner_pdf", { credentials: "include" })
      .then((r) => r.json())
      .then(() =>
        fetch("/api/subscriptions/free-pdf-status", { credentials: "include" })
          .then((s) => s.json())
          .then((d: { eligible?: boolean }) => setFreeLeft(Boolean(d.eligible))),
      )
      .catch(() => setFreeLeft(false));
  }, [access.allowed]);

  const onDownloadClick = useCallback(async () => {
    if (access.allowed) {
      onAllowedDownload();
      return;
    }

    if (freeLeft && userEmail.trim()) {
      const res = await fetch("/api/subscriptions/planner-lead", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail.trim() }),
      });
      if (res.ok) {
        onAllowedDownload();
        setFreeLeft(false);
        return;
      }
    }

    setShowGate(true);
  }, [access.allowed, freeLeft, userEmail, onAllowedDownload]);

  return (
    <>
      {children({
        onDownloadClick: () => void onDownloadClick(),
        pdfAllowed: access.allowed,
        checking: loading,
      })}
      {showGate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md">
            <ReportAccessGate
              access={access}
              feature="planner_pdf"
              isKo={isKo}
              gated={false}
            >
              <div className="rounded-2xl border border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {freeLeft
                    ? isKo
                      ? "이메일을 입력하면 보고서 1회 무료 다운로드가 가능합니다."
                      : "Enter your email for one free PDF download."
                    : isKo
                      ? "PRO 플랜이 필요합니다."
                      : "PRO plan required."}
                </p>
              </div>
            </ReportAccessGate>
            <button
              type="button"
              className="mt-3 w-full text-center text-sm text-white/80 underline"
              onClick={() => setShowGate(false)}
            >
              {isKo ? "닫기" : "Close"}
            </button>
            <Link
              href="/pricing"
              className="mt-2 block text-center text-sm font-bold text-cyan-300"
            >
              {isKo ? "플랜 보기 →" : "View plans →"}
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
