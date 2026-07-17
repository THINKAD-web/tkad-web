"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { MessageCircle, Phone, FileText, X } from "lucide-react";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";
import { cn } from "@/lib/utils";

type Props = {
  mediaId: string;
  mediaName: string;
  triggerLabel: string;
  className?: string;
  /** 플랜 담기 등 보조 CTA와 동일한 h-9 컴팩트 크기 */
  compact?: boolean;
};

/**
 * 매체 상세 「견적 문의」 모달.
 * 브루탈리스트 톤(border-2, bx-* 토큰, mono 라벨) + 부드러운 모서리(rounded-md)
 * + 부드러운 진입 (fade + scale).
 */
export function MediaInquiryDialog({
  mediaId,
  mediaName,
  triggerLabel,
  className,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          compact
            ? "inline-flex h-9 max-w-full items-center justify-center gap-1 whitespace-normal rounded-xl border px-2.5 text-xs font-semibold transition active:scale-95"
            : "tkad-media-detail-cta-secondary inline-flex h-12 items-center justify-center gap-2 rounded-[22px] border dark:border-white/14 border-gray-200 dark:bg-white/8 bg-gray-100 px-6 font-display text-xs font-black uppercase tracking-[0.18em] dark:text-white text-gray-900 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/12",
          className,
        )}
      >
        <MessageCircle
          className={cn("shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")}
        />
        {triggerLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center dark:bg-black bg-white dark:bg-white/6 bg-gray-500 p-3 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={triggerLabel}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="tkad-glass-surface relative w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex items-start justify-between gap-3 border-b dark:border-white/10 border-gray-200 dark:bg-black bg-white/20 px-5 py-4">
              <div className="min-w-0 dark:text-white text-gray-900">
                <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-600">
                  [ INQUIRY · QUOTE ]
                </p>
                <h2 className="mt-1 truncate text-lg font-black tracking-tight dark:text-white text-gray-900">
                  {triggerLabel}
                </h2>
                <p className="mt-1 truncate text-[11px] tracking-tight dark:text-white text-gray-500">
                  {`// `}{mediaName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border dark:border-white/14 border-gray-200 dark:bg-white/6 bg-gray-50 dark:text-white text-gray-800 transition-colors hover:dark:bg-white/10 bg-gray-100 hover:dark:text-white text-gray-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative space-y-2 p-5">
              <Link
                href={`/contact?media=${mediaId}`}
                onClick={() => setOpen(false)}
                className="group flex items-center gap-3 rounded-[18px] border dark:border-white/14 border-gray-200 bg-[color:var(--qp-accent)] px-4 py-3 text-white shadow-sm transition hover:bg-[color:var(--qp-accent-hover)]"
              >
                <FileText className="h-5 w-5 shrink-0" strokeWidth={2} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-700">
                    [ FORM ]
                  </p>
                  <p className="text-sm font-black tracking-tight">
                    상세 문의 양식 작성
                  </p>
                </div>
                <span className="text-base font-bold">→</span>
              </Link>

              <a
                href={KAKAO_CHANNEL_PUBLIC_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-[18px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 px-4 py-3 dark:text-white text-gray-800 backdrop-blur transition-colors hover:dark:bg-white/10 bg-gray-100"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border dark:border-white/12 border-gray-200"
                  style={{ backgroundColor: "#FEE500", color: "#191919" }}
                  aria-hidden
                >
                  <MessageCircle className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-500">
                    [ KAKAOTALK ]
                  </p>
                  <p className="text-sm font-black tracking-tight">
                    카카오톡 채널 상담
                  </p>
                </div>
                <span className="text-base font-bold">→</span>
              </a>

              <a
                href="tel:02-515-2772"
                className="flex items-center gap-3 rounded-[18px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 px-4 py-3 dark:text-white text-gray-800 backdrop-blur transition-colors hover:dark:bg-white/10 bg-gray-100"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/25 dark:text-white text-gray-800">
                  <Phone className="h-4 w-4" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-500">
                    [ PHONE ]
                  </p>
                  <p className="text-sm font-black tabular-nums tracking-tight">
                    02-515-2772
                  </p>
                </div>
                <span className="text-base font-bold">→</span>
              </a>
            </div>

            <p className="relative border-t dark:border-white/10 border-gray-200 dark:bg-black bg-white/20 px-5 py-3 font-display text-xs font-medium uppercase tracking-[0.18em] dark:text-white">
              {`// `}평일 9:30 – 18:30 / 주말·공휴일 휴무
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
