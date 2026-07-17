"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** 홈 above-fold용 — /media 툴바와 유사한 큰 입력 */
  prominent?: boolean;
};

export function HomeMediaSearch({ className, prominent = false }: Props) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [value, setValue] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (q) router.push(`/media?q=${encodeURIComponent(q)}`);
    else router.push("/media");
  };

  return (
    <form
      onSubmit={submit}
      className={cn("w-full min-w-0", className)}
      role="search"
    >
      <label className="sr-only" htmlFor="home-media-search">
        {t("searchAria")}
      </label>
      <div className="relative">
        <Search
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/35",
            prominent ? "left-4 h-5 w-5" : "left-3 h-4 w-4",
          )}
          aria-hidden
        />
        <input
          id="home-media-search"
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
          enterKeyHint="search"
          className={cn(
            "w-full rounded-md border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-hermes/40",
            "dark:border-white/12 dark:bg-white/8 dark:text-white dark:placeholder:text-white/35",
            prominent
              ? "py-3.5 pl-12 pr-4 text-base shadow-sm sm:text-sm"
              : "py-2.5 pl-10 pr-3 text-sm",
          )}
        />
      </div>
    </form>
  );
}
