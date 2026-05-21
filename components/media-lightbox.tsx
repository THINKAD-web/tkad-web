"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
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
  const safe = images.filter((u) => typeof u === "string" && u.trim().length > 0);
  const n = safe.length;
  const idx = n > 0 ? Math.min(Math.max(0, index), n - 1) : 0;
  const src = safe[idx] ?? "";
  const indexRef = useRef(idx);

  useLayoutEffect(() => {
    indexRef.current = idx;
  }, [idx, open]);

  const slideKey = `${idx}-${src}`;
  const [failedSlideKey, setFailedSlideKey] = useState<string | null>(null);
  const imgFailed = failedSlideKey === slideKey;

  const goPrev = useCallback(() => {
    if (n < 2) return;
    const cur = indexRef.current;
    const next = (cur - 1 + n) % n;
    indexRef.current = next;
    onIndexChange(next);
  }, [n, onIndexChange]);

  const goNext = useCallback(() => {
    if (n < 2) return;
    const cur = indexRef.current;
    const next = (cur + 1) % n;
    indexRef.current = next;
    onIndexChange(next);
  }, [n, onIndexChange]);

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
    if (!open) return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [open]);

  if (!open || n === 0 || typeof document === "undefined") {
    return null;
  }

  const overlay = (
    <div
      className="fixed inset-0 z-[200] flex flex-col dark:bg-black bg-white bg-white/92"
      role="dialog"
      aria-modal="true"
      aria-label={labels.expand}
    >
      <button
        type="button"
        onClick={close}
        className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full dark:bg-white/10 bg-gray-100 dark:text-white text-gray-900 backdrop-blur-sm transition hover:bg-white/20"
        aria-label={labels.close}
      >
        <X className="h-6 w-6" strokeWidth={2} />
      </button>

      {n > 1 ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full dark:bg-white/10 bg-gray-100 dark:text-white text-gray-900 backdrop-blur-sm transition hover:bg-white/20 sm:left-4"
            aria-label={labels.prev}
          >
            <ChevronLeft className="h-7 w-7" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full dark:bg-white/10 bg-gray-100 dark:text-white text-gray-900 backdrop-blur-sm transition hover:bg-white/20 sm:right-4"
            aria-label={labels.next}
          >
            <ChevronRight className="h-7 w-7" strokeWidth={2} />
          </button>
        </>
      ) : null}

      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center px-3 pb-10 pt-14 sm:px-6"
        onClick={close}
      >
        <div
          className="flex max-h-[min(78dvh,82vh)] w-full max-w-5xl flex-1 items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {imgFailed ? (
            <div className="rounded-lg border dark:border-white/20 border-gray-300 dark:bg-white/5 bg-gray-50 px-6 py-8 text-center dark:text-white text-gray-900">
              <p className="text-sm font-medium">이미지를 불러올 수 없습니다.</p>
              <p className="mt-2 text-xs dark:text-white text-gray-600">
                Could not load image.
              </p>
              {src ? (
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-sm font-semibold text-gold underline-offset-4 hover:underline"
                >
                  새 탭에서 열기
                </a>
              ) : null}
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={slideKey}
              src={src}
              alt={`${altBase} — ${idx + 1} / ${n}`}
              className="max-h-full max-w-full object-contain"
              loading="eager"
              decoding="async"
              draggable={false}
              onError={() => setFailedSlideKey(slideKey)}
            />
          )}
        </div>

        {n > 1 ? (
          <p className="mt-2 text-center text-xs font-medium dark:text-white text-gray-700">
            {idx + 1} / {n}
          </p>
        ) : null}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
