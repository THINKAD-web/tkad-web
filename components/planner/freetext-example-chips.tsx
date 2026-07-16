"use client";

import { useMemo, useState } from "react";
import {
  FREETEXT_CHIP_PROMPTS_EN,
  FREETEXT_CHIP_PROMPTS_KO,
  FREETEXT_EXAMPLE_CHIP_COUNT,
  FREETEXT_EXAMPLE_PROMPTS_EN,
  FREETEXT_EXAMPLE_PROMPTS_KO,
  pickFreetextExamplePrompts,
} from "@/lib/planner/freetext-example-prompts";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  onSelect: (example: string) => void;
  disabled?: boolean;
  chipClassName?: string;
  className?: string;
  /** 홈 슬림 모드 등 — 노출 칩 수 제한 */
  maxChips?: number;
  /** "새 예시" 버튼 숨김 */
  hideShuffle?: boolean;
};

export function FreetextExampleChips({
  isKo,
  onSelect,
  disabled = false,
  chipClassName,
  className,
  maxChips,
  hideShuffle = false,
}: Props) {
  const [exampleSeed, setExampleSeed] = useState(1);
  const examplePool = isKo
    ? FREETEXT_EXAMPLE_PROMPTS_KO
    : FREETEXT_EXAMPLE_PROMPTS_EN;
  const chipPool = isKo ? FREETEXT_CHIP_PROMPTS_KO : FREETEXT_CHIP_PROMPTS_EN;

  const visibleExamples = useMemo(() => {
    const picked =
      exampleSeed === 1
        ? [...chipPool]
        : pickFreetextExamplePrompts(
            examplePool,
            FREETEXT_EXAMPLE_CHIP_COUNT,
            exampleSeed,
          );
    return maxChips != null ? picked.slice(0, maxChips) : picked;
  }, [chipPool, examplePool, exampleSeed, maxChips]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {isKo ? "이렇게 입력해보세요" : "Try an example"}
        </p>
        {!hideShuffle ? (
          <button
            type="button"
            onClick={() => setExampleSeed((n) => n + 1)}
            className="text-xs font-semibold text-violet-600 underline-offset-2 hover:underline dark:text-violet-300"
          >
            {isKo ? "새 예시" : "More examples"}
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {visibleExamples.map((example) => (
          <button
            key={`${exampleSeed}-${example}`}
            type="button"
            onClick={() => onSelect(example)}
            disabled={disabled}
            className={cn(
              "max-w-full truncate rounded-full border px-3 py-1.5 text-left text-xs leading-snug transition-colors",
              "border-gray-200 bg-white hover:bg-gray-50 dark:border-white/12 dark:bg-white/5 dark:hover:bg-white/10",
              "disabled:opacity-50",
              chipClassName,
            )}
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
