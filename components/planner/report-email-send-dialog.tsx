"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Loader2, Mail } from "lucide-react";
import Modal from "@/components/ui/modal";
import { BtnBlock } from "@/components/brutalist";
import {
  buildDefaultPlannerReportEmailBody,
  buildPlannerReportEmailSubject,
} from "@/lib/planner-report-export/email-cover";
import { sendPlannerReportEmail } from "@/lib/planner-report-export/client";
import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";
import { plannerReportFileBase } from "@/lib/planner-report-export/types";
import type { PlanReportActivitySource } from "@/lib/plan-report-activity/types";
import type { PlannerReportSectionVisibility } from "@/lib/planner-report-export/section-visibility";
import type { PlannerExportLineupViewMode } from "@/lib/planner-report-view-mode";
import { cn } from "@/lib/utils";

function mapEmailSendError(
  message: string,
  t: (key: string) => string,
): string {
  const lower = message.toLowerCase();
  if (lower.includes("email not configured")) return t("reportEmailNotConfigured");
  if (lower.includes("login required")) return t("reportEmailLoginRequired");
  if (lower.includes("pro required")) return t("reportEmailProRequired");
  if (lower.includes("failed to generate pdf")) return t("reportPdfError");
  return message || t("reportEmailFailed");
}

type Props = {
  open: boolean;
  onClose: () => void;
  isKo: boolean;
  initialEmail?: string;
  exportPayload: PlannerReportExportPayload;
  activitySource?: PlanReportActivitySource;
  sectionVisibility?: PlannerReportSectionVisibility;
  lineupViewMode?: PlannerExportLineupViewMode;
  onSent?: (args: { email: string; pdfFilename: string }) => void;
};

export function ReportEmailSendDialog({
  open,
  onClose,
  isKo,
  initialEmail = "",
  exportPayload,
  activitySource,
  sectionVisibility,
  lineupViewMode,
  onSent,
}: Props) {
  const t = useTranslations("planner");
  const [recipientEmail, setRecipientEmail] = useState(initialEmail);
  const [emailBody, setEmailBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pdfFilename = useMemo(
    () => `${plannerReportFileBase(exportPayload)}.pdf`,
    [exportPayload],
  );
  const emailSubject = useMemo(
    () => buildPlannerReportEmailSubject(exportPayload),
    [exportPayload],
  );

  useEffect(() => {
    if (!open) return;
    setRecipientEmail(initialEmail);
    setEmailBody(buildDefaultPlannerReportEmailBody(exportPayload));
    setError(null);
    setSending(false);
  }, [open, initialEmail, exportPayload]);

  const handleSend = useCallback(async () => {
    const email = recipientEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(isKo ? "올바른 이메일 주소를 입력해 주세요." : "Please enter a valid email address.");
      return;
    }
    if (!emailBody.trim()) {
      setError(isKo ? "메일 본문을 입력해 주세요." : "Please enter the email body.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const result = await sendPlannerReportEmail(email, exportPayload, {
        activitySource,
        sectionVisibility,
        lineupViewMode,
        emailBody,
      });
      onSent?.({ email, pdfFilename: result.pdfFilename });
      onClose();
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      setError(mapEmailSendError(raw, t));
    } finally {
      setSending(false);
    }
  }, [
    recipientEmail,
    emailBody,
    exportPayload,
    activitySource,
    sectionVisibility,
    lineupViewMode,
    isKo,
    onSent,
    onClose,
    t,
  ]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={sending}
      className="max-w-xl"
      ariaLabel={isKo ? "제안서 이메일 발송 확인" : "Confirm proposal email"}
    >
      <div className="relative p-5 sm:p-6">
        <div className="mb-5 pr-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--qp-accent)]">
            {isKo ? "발송 전 확인" : "Review before sending"}
          </p>
          <h2 className="mt-1 text-lg font-bold dark:text-white text-gray-900">
            {isKo ? "제안서 이메일 발송" : "Email proposal PDF"}
          </h2>
          <p className="mt-1 text-sm dark:text-white/65 text-gray-600">
            {isKo
              ? "광고주에게 나가는 메일입니다. 내용을 확인한 뒤 발송해 주세요."
              : "This email goes to your client. Review everything before sending."}
          </p>
        </div>

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold dark:text-white/70 text-gray-600">
              {isKo ? "받는 사람" : "Recipient"}
            </span>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => {
                setRecipientEmail(e.target.value);
                setError(null);
              }}
              placeholder={isKo ? "client@company.com" : "client@company.com"}
              className={cn(
                "h-10 w-full rounded-xl border px-3 text-sm",
                "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white",
                "dark:text-white text-gray-900",
                "focus:border-[color:var(--qp-accent)]/60 focus:outline-none",
              )}
              autoComplete="email"
            />
          </label>

          <div className="rounded-xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-slate-50 p-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--qp-accent)]/15 text-[color:var(--qp-accent)]">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold dark:text-white/70 text-gray-600">
                  {isKo ? "첨부 PDF" : "PDF attachment"}
                </p>
                <p className="mt-0.5 break-all text-sm font-medium dark:text-white text-gray-900">
                  {pdfFilename}
                </p>
                <p className="mt-1 text-xs dark:text-white/50 text-gray-500">
                  {isKo
                    ? "발송 버튼을 누르면 최신 편집 내용으로 PDF가 생성됩니다."
                    : "The PDF is generated from your latest edits when you send."}
                </p>
              </div>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold dark:text-white/70 text-gray-600">
              {isKo ? "메일 제목" : "Subject"}
            </span>
            <p className="rounded-xl border dark:border-white/10 border-gray-200 dark:bg-black/20 bg-white px-3 py-2 text-sm dark:text-white/90 text-gray-800">
              {emailSubject}
            </p>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold dark:text-white/70 text-gray-600">
              {isKo ? "메일 본문" : "Email body"}
            </span>
            <textarea
              value={emailBody}
              onChange={(e) => {
                setEmailBody(e.target.value);
                setError(null);
              }}
              rows={8}
              className={cn(
                "w-full resize-y rounded-xl border px-3 py-2 text-sm leading-relaxed",
                "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white",
                "dark:text-white text-gray-900",
                "focus:border-[color:var(--qp-accent)]/60 focus:outline-none",
              )}
            />
          </label>

          {error ? (
            <p className="text-sm font-medium text-rose-500" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <BtnBlock
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={sending}
          >
            {isKo ? "취소" : "Cancel"}
          </BtnBlock>
          <BtnBlock
            variant="accent"
            size="md"
            onClick={() => void handleSend()}
            disabled={sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {sending
              ? isKo
                ? "발송 중…"
                : "Sending…"
              : isKo
                ? "발송"
                : "Send"}
          </BtnBlock>
        </div>
      </div>
    </Modal>
  );
}
