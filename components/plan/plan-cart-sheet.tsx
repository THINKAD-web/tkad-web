"use client";

import Image from "next/image";
import { Drawer } from "vaul";
import { Trash2, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { usePlanCart } from "@/hooks/use-plan-cart";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { shouldUseUnoptimizedImage } from "@/lib/optimized-image-url";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isKo?: boolean;
};

export function PlanCartSheet({ open, onOpenChange, isKo = true }: Props) {
  const { cart, remove, clear } = usePlanCart();
  const items = cart.items;
  const locale = isKo ? "ko-KR" : "en-US";

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} modal>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[70] bg-black/45" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-[71] flex max-h-[min(88dvh,42rem)] flex-col rounded-t-2xl border-t border-border/80 bg-card outline-none",
            "dark:border-white/10 dark:bg-[#0a0a12]",
          )}
        >
          <Drawer.Handle className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/25" />
          <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3 dark:border-white/10">
            <div className="min-w-0">
              <Drawer.Title className="text-sm font-bold text-foreground">
                {isKo ? "담은 매체" : "Selected media"}
              </Drawer.Title>
              <p className="tkad-type-meta mt-0.5 text-tkad-muted">
                {isKo
                  ? `${items.length}개 매체`
                  : `${items.length} item${items.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 dark:border-white/12 dark:bg-white/8 dark:text-white/80"
              aria-label={isKo ? "닫기" : "Close"}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
              <p className="text-sm font-semibold text-foreground">
                {isKo ? "아직 담은 매체가 없어요" : "No media in your plan yet"}
              </p>
              <p className="tkad-type-meta mt-1 text-tkad-muted">
                {isKo
                  ? "매체 카드의 담기+로 추가할 수 있어요."
                  : "Use Add on media cards to build your plan."}
              </p>
              <Link
                href="/media"
                onClick={() => onOpenChange(false)}
                className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 px-4 text-sm font-semibold text-foreground dark:border-white/12"
              >
                {isKo ? "매체 검색하기" : "Browse media"}
              </Link>
            </div>
          ) : (
            <>
              <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-3">
                {items.map((item) => {
                  const thumb = item.thumbnailUrl;
                  const thumbUnoptimized = thumb
                    ? shouldUseUnoptimizedImage(thumb)
                    : false;
                  return (
                    <li
                      key={item.mediaId}
                      className="flex items-center gap-3 rounded-xl border border-gray-200/90 bg-white p-2.5 dark:border-white/10 dark:bg-white/[0.04]"
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-white/10">
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="48px"
                            unoptimized={thumbUnoptimized}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-tkad-muted">
                            {isKo ? "이미지" : "Img"}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {item.mediaName}
                        </p>
                        <p className="tkad-type-meta mt-0.5 truncate text-tkad-muted">
                          {[item.mediaType, item.region]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        <p className="tkad-type-meta mt-0.5 font-medium tabular-nums text-foreground">
                          {formatCatalogPriceFieldWon(item.price, locale)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(item.mediaId)}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-white/12 dark:hover:border-rose-400/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                        aria-label={
                          isKo
                            ? `${item.mediaName} 제거`
                            : `Remove ${item.mediaName}`
                        }
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="flex shrink-0 items-center gap-2 border-t border-border/70 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    clear();
                    onOpenChange(false);
                  }}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-700 dark:border-white/12 dark:text-white/80"
                >
                  <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                  {isKo ? "전체 비우기" : "Clear all"}
                </button>
                <Link
                  href="/my/plan"
                  onClick={() => onOpenChange(false)}
                  className="tkad-neon-cta-clean inline-flex h-10 flex-1 items-center justify-center rounded-xl px-4 text-sm font-bold text-white"
                >
                  {isKo ? "내 플랜에서 보기" : "Open my plan"}
                </Link>
              </div>
            </>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
