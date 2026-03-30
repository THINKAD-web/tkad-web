"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type MediaLightboxLabels = {
  close: string;
  prev: string;
  next: string;
  expand: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  images: string[];
  index: number;
  onIndexChange: (i: number) => void;
  altBase: string;
  labels: MediaLightboxLabels;
};

export default function MediaLightbox({
  open,
  onClose,
  images,
  index,
  onIndexChange,
  altBase,
  labels,
}: Props) {
  const safe =
    images.length > 0
      ? images
      : ["https://picsum.photos/seed/tkad-media-empty/1200/800"];
  const n = safe.length;
  const idx = Math.min(Math.max(0, index), n - 1);
  const src = safe[idx] ?? safe[0];
  const slideKey = `${idx}-${src}`;
  const [failedSlideKey, setFailedSlideKey] = useState<string | null>(null);
  const imgFailed = failedSlideKey === slideKey;

  const goPrev = useCallback(() => {
    onIndexChange((idx - 1 + n) % n);
  }, [idx, n, onIndexChange]);

  const goNext = useCallback(() => {
    onIndexChange((idx + 1) % n);
  }, [idx, n, onIndexChange]);

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close, goPrev, goNext]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-white/90 p-3 pt-14 pb-8 backdrop-blur-md sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={labels.expand}
      onClick={close}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          close();
        }}
        className="absolute top-4 right-4 z-[92] flex h-11 w-11 items-center justify-center rounded-full border border-navy/10 bg-white text-navy shadow-md transition hover:bg-slate-50"
        aria-label={labels.close}
      >
        <X className="h-5 w-5" />
      </button>

      {n > 1 ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute top-1/2 left-2 z-[92] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-navy/10 bg-white text-navy shadow-md transition hover:bg-slate-50 sm:left-4"
            aria-label={labels.prev}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute top-1/2 right-2 z-[92] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-navy/10 bg-white text-navy shadow-md transition hover:bg-slate-50 sm:right-4"
            aria-label={labels.next}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      ) : null}

      <div
        className="relative z-[91] mx-auto flex min-h-0 w-full max-w-[min(96vw,100%)] items-center justify-center rounded-2xl bg-slate-100/80 px-2 py-4 ring-1 ring-navy/5"
        onClick={(e) => e.stopPropagation()}
      >
        {imgFailed ? (
          <div className="max-w-md rounded-xl border border-navy/10 bg-white px-5 py-8 text-center text-navy shadow-sm">
            <p className="text-sm font-semibold">
              이미지를 불러올 수 없습니다.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Could not load image. Open in a new tab or check the URL.
            </p>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block text-sm font-semibold text-gold-dark underline underline-offset-4 hover:text-navy"
            >
              새 탭에서 열기 / Open in new tab
            </a>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={src}
            src={src}
            alt={`${altBase} — ${idx + 1} / ${n}`}
            className="mx-auto max-h-[min(82dvh,85vh)] w-auto max-w-full rounded-lg object-contain shadow-lg ring-1 ring-black/5"
            loading="eager"
            decoding="async"
                onError={() => setFailedSlideKey(slideKey)}
          />
        )}
      </div>
    </div>
  );
}
