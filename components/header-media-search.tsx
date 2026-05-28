"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { withSearchParamsSuspense } from "@/components/with-search-params-suspense";

type Props = {
  className?: string;
  /** 모바일 행 등에서 입력 높이만 살짝 줄일 때 */
  compact?: boolean;
};

/** URL `q`·경로가 바뀔 때만 리마운트되어 초기값과 동기화 (effect 없음). */
function HeaderMediaSearchField({
  className,
  compact,
  defaultQuery,
}: Props & { defaultQuery: string }) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [value, setValue] = useState(defaultQuery);

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
      <label className="sr-only" htmlFor="tkad-header-media-search">
        {t("searchAria")}
      </label>
      <div
        className={cn(
          "flex items-stretch overflow-hidden rounded-xl border-2 border-border/40 bg-card/80 shadow-sm backdrop-blur-sm dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50",
          compact ? "h-9" : "h-10",
        )}
      >
        <input
          id="tkad-header-media-search"
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none dark:text-white text-gray-900 dark:placeholder:dark:text-white"
        />
        <button
          type="submit"
          aria-label={t("searchSubmit")}
          className="inline-flex shrink-0 items-center justify-center border-l border-border/40 px-3 text-foreground transition-colors hover:bg-foreground/5 dark:border-white/12 border-gray-200 dark:text-white text-gray-900 dark:hover:dark:bg-white/8 bg-gray-100"
        >
          <Search className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </button>
      </div>
    </form>
  );
}

function HeaderMediaSearchInner(props: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQ = pathname === "/media" ? (searchParams.get("q") ?? "") : "";
  const syncKey = `${pathname}::${urlQ}`;

  return (
    <HeaderMediaSearchField key={syncKey} defaultQuery={urlQ} {...props} />
  );
}

export const HeaderMediaSearch = withSearchParamsSuspense(HeaderMediaSearchInner);
