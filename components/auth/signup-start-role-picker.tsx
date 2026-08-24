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
          data-selected={value === opt.value ? "true" : "false"}
          onClick={() => onChange(opt.value)}
          className={cn(
            "tkad-qp-auth-role w-full border px-4 py-3 text-left transition-colors",
            value === opt.value
              ? "border-[color:var(--qp-accent)]/45"
              : "dark:border-white/10 border-gray-200 bg-white dark:bg-black/20 hover:border-[color:var(--qp-accent)]/25",
          )}
        >
          <p className="text-sm font-bold tracking-tight">{t(opt.labelKey)}</p>
          <p
            className={cn(
              "mt-1 text-[11px]",
              value === opt.value ? "tkad-qp-text-muted-on-accent" : "tkad-qp-text-muted",
            )}
          >
            {t(opt.descKey)}
          </p>
        </button>
      ))}
    </div>
  );
}
