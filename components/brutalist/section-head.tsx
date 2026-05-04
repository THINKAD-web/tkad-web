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
        "mb-10",
        divider && "border-b-2 border-border pb-6",
        align === "center" && "text-center",
        className,
      )}
    >
      <div className="font-mono text-[12px] uppercase tracking-[0.2em] text-muted-foreground">
        <span className="font-semibold text-hermes">[{number}]</span>
        {category ? (
          <span className="ml-2 text-muted-foreground">/ {category}</span>
        ) : null}
      </div>
      <h2 className="mt-4 text-3xl font-black leading-[1.08] tracking-tight text-foreground sm:text-4xl lg:text-6xl">
        {title}
      </h2>
      {meta ? (
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          // {meta}
        </p>
      ) : null}
    </header>
  );
}
