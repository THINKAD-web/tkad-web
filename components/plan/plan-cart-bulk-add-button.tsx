"use client";

import { ListPlus } from "lucide-react";
import { useLocale } from "next-intl";
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
  className?: string;
};

export function PlanCartBulkAddButton({ items, label, className }: Props) {
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
      toast.success(`${result.added}개 매체가 플랜에 추가됐어요 ✓`);
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
      size="md"
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
