"use client";

import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  /** 매체 선택, 날짜 입력 등 draft 콘텐츠 요약 카운트. */
  selectedMediaCount: number;
  /** 마지막 활동 시각(ms). null 이면 미표시. */
  draftSavedAt: number | null;
  /** 이어서 작성 — 모달 닫고 store 상태 그대로 사용. */
  onRestore: () => void;
  /** 새로 시작 — store.resetAll() 후 모달 닫음. */
  onDiscard: () => void;
};

function formatRelative(ms: number, locale: string): string {
  const diffMin = Math.max(0, Math.round((Date.now() - ms) / 60_000));
  const isKo = locale === "ko";
  if (diffMin < 1) return isKo ? "방금 전" : "Just now";
  if (diffMin < 60) {
    return isKo ? `${diffMin}분 전` : `${diffMin} min ago`;
  }
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return isKo ? `${hours}시간 전` : `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return isKo ? `${days}일 전` : `${days} d ago`;
}

/** 24시간 이내 작성 중이던 draft 가 있을 때 노출. */
export function QuoteRestoreModal({
  open,
  selectedMediaCount,
  draftSavedAt,
  onRestore,
  onDiscard,
}: Props) {
  const t = useTranslations("quote.restore");
  // useTranslations 인스턴스에서 locale 직접 읽을 수 없어 navigator 폴백 사용.
  const locale =
    typeof navigator !== "undefined" && navigator.language?.startsWith("en")
      ? "en"
      : "ko";
  const relative = draftSavedAt
    ? formatRelative(draftSavedAt, locale)
    : null;

  return (
    <Modal
      open={open}
      onClose={onDiscard}
      ariaLabel={t("title")}
      className="max-w-md"
    >
      <div className="p-6 sm:p-7">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15">
            <Clock className="h-4 w-4 text-gold" aria-hidden />
          </span>
          <h2 className="text-lg font-semibold text-navy">{t("title")}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("body", { count: selectedMediaCount })}
        </p>
        {relative ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("savedAt", { relative })}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onDiscard}
            className="sm:min-w-[120px]"
          >
            {t("discard")}
          </Button>
          <Button
            type="button"
            onClick={onRestore}
            className="bg-gold text-navy hover:bg-gold/90 sm:min-w-[120px]"
          >
            {t("restore")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
