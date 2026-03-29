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
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        <button
          type="button"
          onClick={() => setTab("sales")}
          className={cn(
            "rounded-t-md px-4 py-2 text-sm font-semibold transition-colors",
            tab === "sales"
              ? "bg-navy text-white"
              : "text-muted-foreground hover:bg-slate-100",
          )}
        >
          {t("tabSales")}
        </button>
        <button
          type="button"
          onClick={() => setTab("booking")}
          className={cn(
            "rounded-t-md px-4 py-2 text-sm font-semibold transition-colors",
            tab === "booking"
              ? "bg-navy text-white"
              : "text-muted-foreground hover:bg-slate-100",
          )}
        >
          {t("tabBooking")}
        </button>
      </div>
      {tab === "sales" ? <AdminQuotesListClient /> : <AdminOohQuotesClient />}
    </div>
  );
}
