"use client";

import { useCart } from "@/lib/cart";
import { useAppToast } from "@/lib/use-toast";
import { Check, Plus, ShoppingCart } from "lucide-react";
import { Link } from "@/i18n/navigation";

type Props = {
  mediaId: string;
  mediaName?: string;
  className?: string;
};

export function MediaDetailAddToCart({ mediaId, mediaName, className = "" }: Props) {
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

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex h-11 items-center justify-center gap-2 border-2 px-5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors ${
          inCart
            ? "border-accent bg-accent text-accent-foreground hover:bg-foreground hover:border-border"
            : "border-border bg-hero-void text-hero-fg hover:bg-accent hover:border-accent"
        }`}
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
          className="inline-flex h-11 items-center gap-1.5 border-2 border-border bg-card px-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-muted sm:px-4"
        >
          <ShoppingCart className="h-4 w-4" />
          <span className="hidden sm:inline">장바구니</span>
          <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center bg-accent px-1 text-[10px] font-bold text-accent-foreground">
            {ids.length}
          </span>
        </Link>
      )}
    </div>
  );
}
