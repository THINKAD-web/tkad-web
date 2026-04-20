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
        className={`
          inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg
          text-sm font-semibold transition-all duration-200
          hover:-translate-y-px active:translate-y-0 active:scale-[0.98]
          ${inCart
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:shadow-sm"
            : "bg-primary text-white hover:opacity-90 shadow-sm hover:shadow-md"
          }
        `}
        aria-pressed={inCart}
      >
        {inCart ? (
          <>
            <Check className="w-4 h-4" />
            장바구니에 담김
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            견적서에 담기
          </>
        )}
      </button>
      {ids.length > 0 && (
        <Link
          href="/cart"
          className="inline-flex items-center gap-1.5 h-11 px-3 sm:px-4 border border-border bg-card rounded-lg text-xs sm:text-sm font-medium text-foreground hover:bg-secondary/60 transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          <span className="hidden sm:inline">장바구니</span>
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold">
            {ids.length}
          </span>
        </Link>
      )}
    </div>
  );
}
