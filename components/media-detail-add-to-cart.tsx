"use client";

import { useCart } from "@/lib/cart";
import { Check, Plus } from "lucide-react";
import Link from "next/link";

type Props = {
  mediaId: string;
  className?: string;
};

export function MediaDetailAddToCart({ mediaId, className = "" }: Props) {
  const { has, toggle, ids } = useCart();
  const inCart = has(mediaId);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => toggle(mediaId)}
        className={`
          inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
          text-sm font-semibold transition-all
          ${inCart
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            : "bg-primary text-white hover:opacity-90 shadow-sm"
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
            제안서에 담기
          </>
        )}
      </button>
      {ids.length > 0 && (
        <Link
          href="/cart"
          className="inline-flex items-center text-xs font-medium px-3 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          장바구니 ({ids.length})
        </Link>
      )}
    </div>
  );
}
