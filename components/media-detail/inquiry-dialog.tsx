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
          "inline-flex items-center justify-center gap-2 rounded-md border-2 border-bx-black bg-bx-white px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.18em] text-bx-black transition-all duration-200 hover:bg-bx-black hover:text-bx-white",
          className,
        )}
      >
        <MessageCircle className="h-4 w-4 shrink-0" />
        {triggerLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-bx-black/60 p-3 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={triggerLabel}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-lg border-2 border-bx-black bg-bx-white shadow-[8px_8px_0_0_var(--bx-black)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b-2 border-bx-black bg-bx-off px-5 py-4 rounded-t-md">
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                  [ INQUIRY ]
                </p>
                <h2 className="mt-1 truncate text-lg font-bold tracking-tight text-bx-black">
                  {triggerLabel}
                </h2>
                <p className="mt-1 truncate font-mono text-[11px] tracking-tight text-bx-gray-dim">
                  {`// `}
                  {mediaName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2 border-bx-black bg-bx-white text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 p-5">
              <Link
                href={`/contact?media=${mediaId}`}
                onClick={() => setOpen(false)}
                className="group flex items-center gap-3 rounded-md border-2 border-bx-accent bg-bx-accent px-4 py-3 text-bx-white transition-all hover:bg-bx-black hover:border-bx-black"
              >
                <FileText className="h-5 w-5 shrink-0" strokeWidth={2} />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] opacity-80">
                    [ FORM ]
                  </p>
                  <p className="text-sm font-bold tracking-tight">
                    상세 문의 양식 작성
                  </p>
                </div>
                <span className="font-mono text-base font-bold">→</span>
              </Link>

              <a
                href={KAKAO_CHANNEL_PUBLIC_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-md border-2 border-bx-black bg-bx-white px-4 py-3 text-bx-black transition-all hover:bg-bx-off"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2 border-bx-black"
                  style={{ backgroundColor: "#FEE500", color: "#191919" }}
                  aria-hidden
                >
                  <MessageCircle className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                    [ KAKAOTALK ]
                  </p>
                  <p className="text-sm font-bold tracking-tight">
                    카카오톡 채널 상담
                  </p>
                </div>
                <span className="font-mono text-base font-bold">→</span>
              </a>

              <a
                href="tel:02-515-2772"
                className="flex items-center gap-3 rounded-md border-2 border-bx-black bg-bx-white px-4 py-3 text-bx-black transition-all hover:bg-bx-off"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2 border-bx-black bg-bx-white text-bx-accent">
                  <Phone className="h-4 w-4" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                    [ PHONE ]
                  </p>
                  <p className="text-sm font-bold tabular-nums tracking-tight">
                    02-515-2772
                  </p>
                </div>
                <span className="font-mono text-base font-bold">→</span>
              </a>
            </div>

            <p className="border-t-2 border-bx-black/10 bg-bx-off px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-bx-gray-dim rounded-b-md">
              {`// `}평일 9:30 – 18:30 / 주말·공휴일 휴무
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
