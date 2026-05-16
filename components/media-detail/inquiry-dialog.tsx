"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { MessageCircle, Phone, FileText, X } from "lucide-react";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";
import { buildMediaContactHref } from "@/lib/media-contact";
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
          "tkad-media-detail-cta-secondary inline-flex h-12 items-center justify-center gap-2 rounded-[22px] border border-white/14 bg-white/8 px-6 font-mono text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/12",
          className,
        )}
      >
        <MessageCircle className="h-4 w-4 shrink-0" />
        {triggerLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 sm:items-center sm:p-6"
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
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10] tkad-neon-grid" />
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-24 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.22),transparent_58%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.18),transparent_58%),radial-gradient(circle_at_left,rgba(236,72,153,0.14),transparent_62%)]"
            />
            <div className="relative flex items-start justify-between gap-3 border-b border-white/10 bg-black/20 px-5 py-4">
              <div className="min-w-0 text-white">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/65">
                  [ INQUIRY · QUOTE ]
                </p>
                <h2 className="mt-1 truncate text-lg font-black tracking-tight text-white">
                  {triggerLabel}
                </h2>
                <p className="mt-1 truncate font-mono text-[11px] tracking-tight text-white/55">
                  {`// `}{mediaName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-white/14 bg-white/6 text-white/85 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative space-y-2 p-5">
              <Link
                href={`/contact?media=${mediaId}`}
                onClick={() => setOpen(false)}
                className="group flex items-center gap-3 rounded-[18px] border border-white/14 bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(34,211,238,0.95),rgba(236,72,153,0.95))] px-4 py-3 text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)] transition-transform hover:-translate-y-0.5 hover:opacity-95"
              >
                <FileText className="h-5 w-5 shrink-0" strokeWidth={2} />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">
                    [ FORM ]
                  </p>
                  <p className="text-sm font-black tracking-tight">
                    상세 문의 양식 작성
                  </p>
                </div>
                <span className="font-mono text-base font-bold">→</span>
              </Link>

              <a
                href={KAKAO_CHANNEL_PUBLIC_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-[18px] border border-white/12 bg-white/6 px-4 py-3 text-white/90 backdrop-blur transition-colors hover:bg-white/10"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border border-white/12"
                  style={{ backgroundColor: "#FEE500", color: "#191919" }}
                  aria-hidden
                >
                  <MessageCircle className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                    [ KAKAOTALK ]
                  </p>
                  <p className="text-sm font-black tracking-tight">
                    카카오톡 채널 상담
                  </p>
                </div>
                <span className="font-mono text-base font-bold">→</span>
              </a>

              <a
                href="tel:02-515-2772"
                className="flex items-center gap-3 rounded-[18px] border border-white/12 bg-white/6 px-4 py-3 text-white/90 backdrop-blur transition-colors hover:bg-white/10"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border border-white/12 bg-black/25 text-white/85">
                  <Phone className="h-4 w-4" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                    [ PHONE ]
                  </p>
                  <p className="text-sm font-black tabular-nums tracking-tight">
                    02-515-2772
                  </p>
                </div>
                <span className="font-mono text-base font-bold">→</span>
              </a>
            </div>

            <p className="relative border-t border-white/10 bg-black/20 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
              {`// `}평일 9:30 – 18:30 / 주말·공휴일 휴무
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
