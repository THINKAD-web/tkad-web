"use client";

import { ListPlus } from "lucide-react";
import { useLocale } from "next-intl";
import type { BtnBlockSize } from "@/components/brutalist/btn-block";
import { BtnBlock } from "@/components/brutalist";
import { useAppToast } from "@/lib/use-toast";
import { usePlanCart } from "@/hooks/use-plan-cart";
import { useIsPro } from "@/hooks/use-is-pro";
import { buildPlanCartLimitMessage } from "@/lib/entitlements/gate-messages";
import type { PlanCartItem } from "@/lib/plan-cart";
import { cn } from "@/lib/utils";

type Props = {
  items: Omit<PlanCartItem, "addedAt">[];
  label?: string;
  size?: BtnBlockSize;
  className?: string;
};

export function PlanCartBulkAddButton({ items, label, size = "md", className }: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const toast = useAppToast();
  const { addMany } = usePlanCart();
  const { isPro } = useIsPro();

  function handleClick() {
    if (items.length === 0) {
      toast.warning("담을 매체가 없습니다");
      return;
    }
    const result = addMany(items);
    if (result.added > 0) {
      const filtered =
        result.skippedOnlineBlocked > 0
          ? isKo
            ? ` (${result.skippedOnlineBlocked}개 문의 매체 제외)`
            : ` (${result.skippedOnlineBlocked} inquiry skipped)`
          : "";
      toast.success(
        isKo
          ? `${result.added}개 매체가 플랜에 추가됐어요 ✓${filtered}`
          : `${result.added} media added to plan ✓${filtered}`,
      );
    } else if (result.skippedOnlineBlocked === items.length) {
      toast.warning(
        isKo
          ? "가격 문의 온라인 매체는 담은 매체에 담을 수 없습니다."
          : "Inquiry-only online media cannot be added to your plan.",
      );
    } else if (result.skippedDuplicate === items.length) {
      toast.warning("선택한 매체가 이미 모두 플랜에 있습니다");
    } else {
      toast.show({
        variant: "warning",
        title: isKo ? "플랜 카트 한도" : "Plan cart limit",
        description: buildPlanCartLimitMessage(isKo, isPro),
      });
    }
  }

  return (
    <BtnBlock
      type="button"
      variant="secondary"
      size={size}
      onClick={handleClick}
      className={cn(
        "inline-flex max-w-full items-center gap-2 whitespace-normal !normal-case !tracking-normal rounded-2xl border text-center dark:border-white/12 border-gray-200",
        className,
      )}
    >
      <ListPlus className="h-4 w-4" aria-hidden />
      {label ?? "선택 매체 플랜에 추가"}
    </BtnBlock>
  );
}
