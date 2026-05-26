"use client";

import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import {
  headerChromeIconButtonClass,
  headerChromeIconGhostClass,
  headerMobileMenuRowClass,
} from "@/components/public-chrome/header-chrome-buttons";

export function HeaderCartLink({
  onNavigate,
  variant = "icon",
  className,
  compact = false,
}: {
  onNavigate?: () => void;
  variant?: "icon" | "menu";
  className?: string;
  compact?: boolean;
}) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const { ids } = useCart();
  const label = isKo ? "장바구니" : "Cart";
  const aria = `${label}${ids.length > 0 ? ` (${ids.length})` : ""}`;

  if (variant === "menu") {
    return (
      <Link
        href="/cart"
        onClick={onNavigate}
        className={className ?? headerMobileMenuRowClass}
        aria-label={aria}
      >
        <ShoppingCart className="h-4 w-4 shrink-0" strokeWidth={2} />
        <span className="flex-1">{label}</span>
        {ids.length > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500/20 px-1.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-300">
            {ids.length}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href="/cart"
      onClick={onNavigate}
      className={cn(
        "relative",
        compact ? headerChromeIconGhostClass : headerChromeIconButtonClass,
        className,
      )}
      aria-label={aria}
    >
      <ShoppingCart className="h-4 w-4" strokeWidth={2} />
      {ids.length > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[10px] font-bold text-white ring-1 ring-white/80 dark:ring-[#05050a]">
          {ids.length > 99 ? "99+" : ids.length}
        </span>
      ) : null}
    </Link>
  );
}
