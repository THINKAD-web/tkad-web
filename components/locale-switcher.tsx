"use client";

import { useLocale } from "next-intl";
import { Globe } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

const LOCALE_LABEL: Record<string, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "简体中文",
};

type Props = {
  className?: string;
  compact?: boolean;
};

export function LocaleSwitcher({ className, compact }: Props) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onChange = (next: string) => {
    if (next === locale) return;
    startTransition(() => {
      if (pathname == null) return;
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <label
      className={cn(
        "inline-flex h-9 items-center gap-1 rounded-full border border-primary/14 bg-gray-1008 px-2 text-primary/80 dark:bg-white/8",
        compact && "h-8",
        className,
      )}
    >
      <Globe className="h-4 w-4 shrink-0" aria-hidden />
      <span className="sr-only">Language</span>
      <select
        className="max-w-[6.5rem] cursor-pointer border-0 bg-transparent py-0.5 text-xs font-medium text-inherit outline-none disabled:opacity-60"
        value={locale}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Language"
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {LOCALE_LABEL[loc] ?? loc}
          </option>
        ))}
      </select>
    </label>
  );
}
