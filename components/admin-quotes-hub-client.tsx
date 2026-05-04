"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import AdminQuotesListClient from "@/components/admin-quotes-list-client";
import AdminOohQuotesClient from "@/components/admin-ooh-quotes-client";

type Tab = "sales" | "booking";

export default function AdminQuotesHubClient() {
  const t = useTranslations("adminQuotesHub");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const tab: Tab =
    searchParams.get("tab") === "booking" ? "booking" : "sales";

  const setTab = useCallback(
    (next: Tab) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (next === "sales") sp.delete("tab");
      else sp.set("tab", "booking");
      const q = sp.toString();
      if (pathname == null || pathname === "") return;
      router.replace(q ? `${pathname}?${q}` : pathname);
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b-2 border-border pb-2 dark:border-hero-fg">
        <button
          type="button"
          onClick={() => setTab("sales")}
          className={cn(
            "border-2 border-border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors dark:border-hero-fg",
            tab === "sales"
              ? "bg-hero-void text-hero-fg dark:bg-card dark:text-foreground"
              : "bg-card text-foreground hover:bg-muted dark:bg-hero-void dark:text-hero-fg dark:hover:bg-muted/50",
          )}
        >
          {t("tabSales")}
        </button>
        <button
          type="button"
          onClick={() => setTab("booking")}
          className={cn(
            "border-2 border-border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors dark:border-hero-fg",
            tab === "booking"
              ? "bg-hero-void text-hero-fg dark:bg-card dark:text-foreground"
              : "bg-card text-foreground hover:bg-muted dark:bg-hero-void dark:text-hero-fg dark:hover:bg-muted/50",
          )}
        >
          {t("tabBooking")}
        </button>
      </div>
      {tab === "sales" ? <AdminQuotesListClient /> : <AdminOohQuotesClient />}
    </div>
  );
}
