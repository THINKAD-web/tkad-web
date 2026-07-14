"use client";

import { useCart } from "@/lib/cart";
import { useAppToast } from "@/lib/use-toast";
import { Check, Plus, ShoppingCart } from "lucide-react";
import { Link } from "@/i18n/navigation";

type Props = {
  mediaId: string;
  mediaName?: string;
  className?: string;
  /** 사이드바 등 좁은 영역 — 단일 컴팩트 버튼 */
  compact?: boolean;
  /** 매체 상세 — 견적함 용도 힌트(title) */
  showUsageHint?: boolean;
};

export function MediaDetailAddToCart({
  mediaId,
  mediaName,
  className = "",
  compact = false,
  showUsageHint = false,
}: Props) {
  const { has, toggle, ids } = useCart();
  const toast = useAppToast();
  const inCart = has(mediaId);

  function handleClick() {
    toggle(mediaId);
    if (inCart) {
      toast.warning(
        mediaName
          ? `${mediaName}이(가) 장바구니에서 제거되었습니다.`
          : "장바구니에서 제거되었습니다.",
      );
    } else {
      toast.success(
        mediaName
          ? `${mediaName}이(가) 장바구니에 담겼습니다.`
          : "매체가 장바구니에 담겼습니다.",
      );
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition active:scale-95 ${
          inCart
            ? "border-accent/50 bg-accent/15 text-accent dark:text-accent"
            : "border-gray-200 bg-gray-100 text-gray-800 dark:border-white/12 dark:bg-white/10 dark:text-white/90"
        } ${className}`}
        aria-pressed={inCart}
        title={
          showUsageHint
            ? "견적함: 여러 매체를 모아 한 번에 견적을 요청합니다"
            : undefined
        }
      >
        {inCart ? (
          <>
            <Check className="h-3.5 w-3.5 shrink-0" />
            담김
          </>
        ) : (
          <>
            <Plus className="h-3.5 w-3.5 shrink-0" />
            견적함에 담기
          </>
        )}
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex h-11 items-center justify-center gap-2 border-2 px-5 font-display text-xs font-medium uppercase tracking-[0.18em] transition-colors ${ inCart ? "border-accent bg-accent text-accent-foreground hover:bg-foreground hover:border-border" : "border-border bg-hero-void text-hero-fg hover:bg-accent hover:border-accent" }`}
        aria-pressed={inCart}
      >
        {inCart ? (
          <>
            <Check className="h-4 w-4" />
            장바구니에 담김
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            견적서에 담기
          </>
        )}
      </button>
      {ids.length > 0 && (
        <Link
          href="/cart"
          className="inline-flex h-11 items-center gap-1.5 border-2 border-border bg-card px-3 font-display text-xs font-medium uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-muted sm:px-4"
        >
          <ShoppingCart className="h-4 w-4" />
          <span className="hidden sm:inline">장바구니</span>
          <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center bg-gradient-to-br from-violet-600 to-cyan-500 px-1 text-[10px] font-bold dark:text-white text-gray-900 shadow-[0_1px_8px_rgba(124,58,237,0.35)] dark:from-violet-500 dark:to-cyan-400">
            {ids.length}
          </span>
        </Link>
      )}
    </div>
  );
}
