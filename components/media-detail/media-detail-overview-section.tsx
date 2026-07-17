"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const PREVIEW_CHAR_LIMIT = 220;

type Props = {
  title: string;
  body: string;
  isKo: boolean;
  className?: string;
};

function ProseParagraphs({ text }: { text: string }) {
  const normalized = text.trim();
  if (!normalized) return null;
  const blocks = normalized.split(/\n\s*\n/).filter(Boolean);
  if (blocks.length <= 1) {
    return <p>{normalized}</p>;
  }
  return (
    <>
      {blocks.map((block, i) => (
        <p key={i}>{block.replace(/\s*\n\s*/g, " ").trim()}</p>
      ))}
    </>
  );
}

/** 상세 설명 — 짧으면 펼침, 길면 3줄 미리보기 + 더보기 */
export function MediaDetailOverviewSection({
  title,
  body,
  isKo,
  className,
}: Props) {
  const normalized = body.trim();
  const isLong = useMemo(
    () => normalized.length > PREVIEW_CHAR_LIMIT || normalized.split(/\n/).length > 4,
    [normalized],
  );
  const [expanded, setExpanded] = useState(!isLong);

  if (!normalized) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white p-4",
        className,
      )}
    >
      <h3 className="text-[length:var(--qp-text-h3)] font-bold tracking-tight dark:text-white text-gray-900">{title}</h3>
      <div
        className={cn(
          "mt-3 text-[length:var(--qp-text-body)] leading-relaxed dark:text-white/75 text-gray-700",
          !expanded && isLong && "line-clamp-3",
        )}
      >
        <ProseParagraphs text={normalized} />
      </div>
      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-xs font-semibold text-[color:var(--qp-accent)] hover:text-[color:var(--qp-accent-hover)] dark:text-[color:var(--qp-accent)] dark:hover:text-[color:var(--qp-accent)]"
        >
          {expanded
            ? isKo
              ? "접기"
              : "Show less"
            : isKo
              ? "더 보기"
              : "Show more"}
        </button>
      ) : null}
    </section>
  );
}
