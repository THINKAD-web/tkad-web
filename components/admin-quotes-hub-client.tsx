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
      router.replace(q ? `${pathname}?${q}` : pathname);
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b-2 border-bx-black pb-2 dark:border-bx-white">
        <button
          type="button"
          onClick={() => setTab("sales")}
          className={cn(
            "border-2 border-bx-black px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors dark:border-bx-white",
            tab === "sales"
              ? "bg-bx-black text-bx-white dark:bg-bx-white dark:text-bx-black"
              : "bg-bx-white text-bx-black hover:bg-bx-off dark:bg-bx-black dark:text-bx-white dark:hover:bg-bx-gray-dim/30",
          )}
        >
          {t("tabSales")}
        </button>
        <button
          type="button"
          onClick={() => setTab("booking")}
          className={cn(
            "border-2 border-bx-black px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors dark:border-bx-white",
            tab === "booking"
              ? "bg-bx-black text-bx-white dark:bg-bx-white dark:text-bx-black"
              : "bg-bx-white text-bx-black hover:bg-bx-off dark:bg-bx-black dark:text-bx-white dark:hover:bg-bx-gray-dim/30",
          )}
        >
          {t("tabBooking")}
        </button>
      </div>
      {tab === "sales" ? <AdminQuotesListClient /> : <AdminOohQuotesClient />}
    </div>
  );
}
