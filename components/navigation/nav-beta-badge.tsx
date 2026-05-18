import { cn } from "@/lib/utils";

/** 세부 메뉴 전용 BETA 뱃지 — 메인 카테고리에는 사용하지 않음 */
export function NavBetaBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "category-hero-beta-badge inline-flex shrink-0 items-center rounded-md border border-transparent px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em]",
        className,
      )}
    >
      <span aria-hidden className="mr-0.5 not-italic">
        ✨
      </span>
      BETA
    </span>
  );
}
