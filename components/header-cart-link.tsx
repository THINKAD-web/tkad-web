"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlanCart } from "@/hooks/use-plan-cart";
import { formatPlanCartBadgeCount } from "@/lib/plan-cart-limits";
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
  const t = useTranslations("planNav");
  const { count } = usePlanCart();
  const label = t("cart");
  const badge = formatPlanCartBadgeCount(count);
  const aria = `${label}${count > 0 ? ` (${count})` : ""}`;

  if (variant === "menu") {
    return (
      <Link
        href="/my/plan"
        onClick={onNavigate}
        className={className ?? headerMobileMenuRowClass}
        aria-label={aria}
      >
        <ShoppingCart className="h-4 w-4 shrink-0" strokeWidth={2} />
        <span className="flex-1">{label}</span>
        {count > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500/20 px-1.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-300">
            {badge}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href="/my/plan"
      onClick={onNavigate}
      className={cn(
        "relative",
        compact ? headerChromeIconGhostClass : headerChromeIconButtonClass,
        className,
      )}
      aria-label={aria}
      data-tour="plan-cart"
    >
      <ShoppingCart className="h-4 w-4" strokeWidth={2} />
      {count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[10px] font-bold text-white ring-1 ring-white/80 dark:ring-[#05050a]">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
