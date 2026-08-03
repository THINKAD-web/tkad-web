"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FREETEXT_CHIP_PROMPTS_EN,
  FREETEXT_CHIP_PROMPTS_KO,
  FREETEXT_EXAMPLE_CHIP_COUNT,
  FREETEXT_EXAMPLE_PROMPTS_EN,
  FREETEXT_EXAMPLE_PROMPTS_KO,
  nextFreetextExampleSeed,
  pickFreetextExamplePromptsExcluding,
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

function randomExampleSeed(): number {
  return (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
}

export function FreetextExampleChips({
  isKo,
  onSelect,
  disabled = false,
  chipClassName,
  className,
  maxChips,
  hideShuffle = false,
}: Props) {
  /** 0 = SSR·hydration 고정 칩, >0 = shuffle 적용 */
  const [exampleSeed, setExampleSeed] = useState(0);
  const [excludeExamples, setExcludeExamples] = useState<readonly string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const examplePool = isKo
    ? FREETEXT_EXAMPLE_PROMPTS_KO
    : FREETEXT_EXAMPLE_PROMPTS_EN;
  const chipPool = isKo ? FREETEXT_CHIP_PROMPTS_KO : FREETEXT_CHIP_PROMPTS_EN;

  useEffect(() => {
    setExcludeExamples([]);
    setExampleSeed(randomExampleSeed());
  }, [isKo]);

  const visibleExamples = useMemo(() => {
    const count =
      maxChips != null ?
        Math.min(maxChips, FREETEXT_EXAMPLE_CHIP_COUNT)
      : FREETEXT_EXAMPLE_CHIP_COUNT;

    if (exampleSeed === 0) {
      return [...chipPool].slice(0, count);
    }

    return pickFreetextExamplePromptsExcluding(
      examplePool,
      count,
      exampleSeed,
      excludeExamples,
    );
  }, [chipPool, examplePool, exampleSeed, excludeExamples, maxChips]);

  const handleShuffle = useCallback(() => {
    setIsRefreshing(true);
    window.setTimeout(() => {
      setExcludeExamples(visibleExamples);
      setExampleSeed((seed) => nextFreetextExampleSeed(seed || randomExampleSeed()));
      setIsRefreshing(false);
    }, 160);
  }, [visibleExamples]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {isKo ? "이렇게 입력해보세요" : "Try an example"}
        </p>
        {!hideShuffle ? (
          <button
            type="button"
            onClick={handleShuffle}
            disabled={disabled || isRefreshing}
            className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--qp-accent)] underline-offset-2 transition-opacity hover:underline dark:text-[color:var(--qp-accent)]",
              (disabled || isRefreshing) && "opacity-60",
            )}
          >
            <RefreshCw
              className={cn(
                "h-3 w-3 shrink-0 transition-transform duration-300",
                isRefreshing && "animate-spin",
              )}
              aria-hidden
            />
            {isKo ? "새 예시" : "More examples"}
          </button>
        ) : null}
      </div>
      <div
        className={cn(
          "flex flex-wrap gap-2 transition-opacity duration-150 ease-out",
          isRefreshing ? "opacity-0" : "opacity-100",
        )}
      >
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
