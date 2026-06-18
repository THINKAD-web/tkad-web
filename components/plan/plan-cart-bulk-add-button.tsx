"use client";

import { ListPlus } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { useAppToast } from "@/lib/use-toast";
import { usePlanCart } from "@/hooks/use-plan-cart";
import type { PlanCartItem } from "@/lib/plan-cart";
import { cn } from "@/lib/utils";

type Props = {
  items: Omit<PlanCartItem, "addedAt">[];
  label?: string;
  className?: string;
};

export function PlanCartBulkAddButton({ items, label, className }: Props) {
  const toast = useAppToast();
  const { addMany, maxItems } = usePlanCart();

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
      toast.error(`플랜은 최대 ${maxItems}개 매체까지 가능합니다`);
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
