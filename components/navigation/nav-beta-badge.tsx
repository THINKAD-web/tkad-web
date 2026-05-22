import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";

/** 세부 메뉴 전용 BETA 뱃지 — 메인 카테고리에는 사용하지 않음 */
export function NavBetaBadge({ className }: { className?: string }) {
  return (
    <StatusBadge variant="beta" className={cn("category-hero-beta-badge shrink-0 font-mono", className)}>
      <span aria-hidden className="mr-0.5 not-italic">
        ✨
      </span>
      BETA
    </StatusBadge>
  );
}
