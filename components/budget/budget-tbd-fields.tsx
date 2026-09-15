"use client";

import { cn } from "@/lib/utils";
import { budgetTbdLabel } from "@/lib/budget-tbd";

type Props = {
  isKo: boolean;
  /** 예산 미정 선택 여부 */
  tbd: boolean;
  onTbdChange: (tbd: boolean) => void;
  /** 만원 단위 문자열 (controlled) */
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  inputClassName?: string;
  disabled?: boolean;
  id?: string;
  onFocus?: () => void;
  onBlur?: () => void;
};

/**
 * 숫자 예산 입력 + "예산 미정" 체크박스.
 * TBD 선택 시 숫자 입력은 숨기고 내부적으로 amount 미저장.
 */
export function BudgetTbdFields({
  isKo,
  tbd,
  onTbdChange,
  value,
  onValueChange,
  placeholder,
  inputClassName,
  disabled = false,
  id = "budget-amount",
  onFocus,
  onBlur,
}: Props) {
  const tbdId = `${id}-tbd`;

  return (
    <div className="space-y-2">
      {!tbd ? (
        <input
          id={id}
          type="number"
          min={0}
          inputMode="numeric"
          value={value}
          disabled={disabled}
          onFocus={onFocus}
          onBlur={onBlur}
          onChange={(e) => onValueChange(e.target.value)}
          className={cn(
            "h-11 w-full rounded-xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-white px-3 text-sm dark:text-white text-gray-900",
            inputClassName,
          )}
          placeholder={placeholder ?? (isKo ? "예: 4800" : "e.g. 4800")}
        />
      ) : (
        <p
          className="flex h-11 items-center rounded-xl border border-dashed dark:border-white/15 border-gray-300 dark:bg-white/5 bg-gray-50 px-3 text-sm font-medium text-gray-700 dark:text-white/85"
          aria-live="polite"
        >
          {budgetTbdLabel(isKo)}
        </p>
      )}
      <label
        htmlFor={tbdId}
        className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-white/80"
      >
        <input
          id={tbdId}
          type="checkbox"
          checked={tbd}
          disabled={disabled}
          onChange={(e) => onTbdChange(e.target.checked)}
          className="size-4 rounded border-gray-300 accent-[color:var(--qp-accent)]"
        />
        {budgetTbdLabel(isKo)}
      </label>
    </div>
  );
}
