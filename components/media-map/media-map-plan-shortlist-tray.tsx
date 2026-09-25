"use client";

import { useMemo, useState } from "react";
import { ChevronUp, LayoutList } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { FloatingSelectionBar } from "@/components/floating-selection-bar";
import { PlanCartSheet } from "@/components/plan/plan-cart-sheet";
import { BunnyFallbackImage } from "@/components/bunny-fallback-image";
import {
  STICKY_ACTION_BAR_BTN,
  STICKY_ACTION_BAR_BTN_IDLE,
  STICKY_ACTION_BAR_BTN_PRIMARY,
  STICKY_ACTION_BAR_ROW,
} from "@/components/sticky-action-bar";
import { usePlanCart } from "@/hooks/use-plan-cart";
import { planCartMonthlyTotalWon } from "@/lib/plan-cart-pricing";
import { buildSelectionQuoteHref } from "@/lib/media-selection-bar";
import { formatMediaPriceWithPeriodSuffix } from "@/lib/media-price-format";
import { trackMapPreviewCta } from "@/lib/map-ga-events";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
};

function formatTrayBudgetWon(total: number, isKo: boolean): string {
  if (!Number.isFinite(total) || total <= 0) {
    return isKo ? "예산 합산 중" : "Estimating";
  }
  const man = Math.round(total / 10_000);
  if (isKo && man >= 1) return `월 약 ${man.toLocaleString("ko-KR")}만원`;
  return isKo
    ? `월 약 ₩${total.toLocaleString("ko-KR")}`
    : `~₩${total.toLocaleString("en-US")}/mo`;
}

export function MediaMapPlanShortlistTray({ isKo }: Props) {
  const { cart, count } = usePlanCart();
  const [expanded, setExpanded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const monthlyTotal = useMemo(
    () => planCartMonthlyTotalWon(cart, null),
    [cart],
  );

  const quoteHref = buildSelectionQuoteHref(
    [],
    cart.items.map((i) => i.mediaId),
  );
  const plannerHref =
    cart.items.length === 1
      ? `/planner?addMedia=${encodeURIComponent(cart.items[0]!.mediaId)}`
      : "/my/plan";

  if (count <= 0) return null;

  const toggleTray = () => {
    setExpanded((v) => {
      if (!v) {
        trackMapPreviewCta({
          cta_kind: "open_tray",
          media_id: cart.items[0]?.mediaId ?? "",
        });
      }
      return !v;
    });
  };

  const goPlanner = () => {
    trackMapPreviewCta({
      cta_kind: "go_to_planner",
      media_id: cart.items[0]?.mediaId ?? "",
    });
  };

  return (
    <>
      <PlanCartSheet open={sheetOpen} onOpenChange={setSheetOpen} isKo={isKo} />
      <FloatingSelectionBar
        open
        variant="neon"
        compact
        aboveMobileChrome
        hideSpacer
        ariaLabel={isKo ? "담은 매체 숏리스트" : "Saved media shortlist"}
      >
        <div className="flex flex-col gap-2">
          <div className={STICKY_ACTION_BAR_ROW}>
            <button
              type="button"
              onClick={toggleTray}
              className={cn(
                STICKY_ACTION_BAR_BTN,
                STICKY_ACTION_BAR_BTN_IDLE,
                "min-w-0 flex-1 justify-start gap-2 px-3",
              )}
              aria-expanded={expanded}
            >
              <LayoutList className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 truncate text-left">
                {isKo ? `담은 매체 ${count}건` : `${count} saved`}
                <span className="text-tkad-muted"> · </span>
                {formatTrayBudgetWon(monthlyTotal, isKo)}
              </span>
              <ChevronUp
                className={cn(
                  "ml-auto h-4 w-4 shrink-0 transition-transform",
                  expanded ? "" : "rotate-180",
                )}
                aria-hidden
              />
            </button>
            <Link
              href={plannerHref}
              onClick={goPlanner}
              className={cn(STICKY_ACTION_BAR_BTN, STICKY_ACTION_BAR_BTN_PRIMARY)}
            >
              {isKo ? "플래너" : "Planner"}
            </Link>
            <Link
              href={quoteHref}
              className={cn(STICKY_ACTION_BAR_BTN, STICKY_ACTION_BAR_BTN_IDLE)}
            >
              {isKo ? "견적" : "Quote"}
            </Link>
          </div>

          {expanded ? (
            <ul
              className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-2"
              role="list"
            >
              {cart.items.map((item) => (
                <li
                  key={item.mediaId}
                  className="flex min-w-0 items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5"
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-white/10">
                    {item.thumbnailUrl ? (
                      <BunnyFallbackImage
                        rawSrc={item.thumbnailUrl}
                        alt=""
                        className="object-cover"
                        fill
                        sizes="40px"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate tkad-type-meta font-medium text-foreground">
                      {item.mediaName}
                    </p>
                    <p className="truncate tkad-type-note text-tkad-muted tabular-nums">
                      {formatMediaPriceWithPeriodSuffix(
                        item.price,
                        "month",
                        isKo ? "ko" : "en",
                      )}
                    </p>
                  </div>
                </li>
              ))}
              <li className="list-none pt-1">
                <button
                  type="button"
                  className="w-full rounded-lg border border-white/15 py-2 tkad-type-meta font-medium text-foreground hover:bg-white/5"
                  onClick={() => {
                    setSheetOpen(true);
                    trackMapPreviewCta({
                      cta_kind: "open_tray",
                      media_id: cart.items[0]?.mediaId ?? "",
                    });
                  }}
                >
                  {isKo ? "전체 보기·수정" : "View & edit all"}
                </button>
              </li>
            </ul>
          ) : null}
        </div>
      </FloatingSelectionBar>
    </>
  );
}
