"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  SIGNUP_START_ROLE_OPTIONS,
  type SignupStartRole,
} from "@/lib/signup-start-roles";

type Props = {
  value: SignupStartRole;
  onChange: (role: SignupStartRole) => void;
  ariaLabel?: string;
};

export function SignupStartRolePicker({ value, onChange, ariaLabel }: Props) {
  const t = useTranslations("onboarding");

  return (
    <div className="space-y-2" role="radiogroup" aria-label={ariaLabel}>
      {SIGNUP_START_ROLE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "w-full rounded-[18px] border px-4 py-3 text-left transition-all",
            value === opt.value
              ? "border-white/28 bg-white/14 dark:text-white text-gray-900 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
              : "dark:border-white/10 border-gray-200 dark:bg-black bg-white/25 dark:text-white text-gray-600 hover:border-white/16 hover:dark:text-white text-gray-800",
          )}
        >
          <p className="text-sm font-bold tracking-tight">{t(opt.labelKey)}</p>
          <p className="mt-1 text-[11px] dark:text-white text-gray-500">
            {t(opt.descKey)}
          </p>
        </button>
      ))}
    </div>
  );
}
