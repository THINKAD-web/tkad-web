/**
 * SectionHead — 섹션 상단 [번호] / 카테고리 / 타이틀 / 메타 패턴.
 *
 * 사용 예:
 *   <SectionHead
 *     number="01"
 *     category="Service"
 *     title={<>What we <span className="text-accent">deliver</span></>}
 *     meta="curated for Korean OOH market"
 *   />
 *
 * - 번호·카테고리·메타: JetBrains Mono UPPERCASE
 * - 타이틀: 본문 sans (Space Grotesk + Pretendard), bold, tight tracking
 * - 하단 2px 검정 보더 — 섹션 구분 정체성
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SectionHeadProps = {
  number: string;
  category?: string;
  title: ReactNode;
  meta?: string;
  /** 좌측 정렬(기본) 또는 가운데 정렬 */
  align?: "left" | "center";
  /** 하단 2px 보더 표시 여부 (기본 true). 첫 섹션에서 끄고 싶을 때 false */
  divider?: boolean;
  className?: string;
};

export function SectionHead({
  number,
  category,
  title,
  meta,
  align = "left",
  divider = true,
  className,
}: SectionHeadProps) {
  return (
    <header
      className={cn(
        "mb-12",
        divider &&
          "border-b border-border/60 pb-7 [border-image:linear-gradient(to_right,transparent,var(--border),transparent)_1]",
        align === "center" && "text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          align === "center" ? "justify-center" : "justify-start",
        )}
      >
        <span className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-card/70 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground shadow-[0_14px_44px_rgba(0,0,0,0.08)] backdrop-blur dark:shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
          <span className="text-accent">[{number}]</span>
          {category ? <span className="text-muted-foreground">/ {category}</span> : null}
        </span>
      </div>

      <h2 className="mt-6 text-4xl font-black leading-[1.02] tracking-[-0.05em] text-foreground sm:text-5xl lg:text-6xl">
        {title}
      </h2>
      {meta ? (
        <p className="mt-4 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          <span aria-hidden className="mr-1.5">
            /
          </span>
          {meta}
        </p>
      ) : null}
    </header>
  );
}
