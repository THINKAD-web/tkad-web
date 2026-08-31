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
      <div className="flex w-fit flex-wrap gap-1 rounded-full border border-border/70 bg-card/70 p-1 shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={() => setTab("sales")}
          className={cn(
            "rounded-full px-4 py-2 font-display tkad-type-caption font-black uppercase tracking-[0.18em] transition-colors",
            tab === "sales"
              ? "bg-[color:var(--qp-accent-soft)] text-foreground shadow-sm ring-1 ring-[color:var(--qp-accent)]/25"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t("tabSales")}
        </button>
        <button
          type="button"
          onClick={() => setTab("booking")}
          className={cn(
            "rounded-full px-4 py-2 font-display tkad-type-caption font-black uppercase tracking-[0.18em] transition-colors",
            tab === "booking"
              ? "bg-[color:var(--qp-accent-soft)] text-foreground shadow-sm ring-1 ring-[color:var(--qp-accent)]/25"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t("tabBooking")}
        </button>
      </div>
      {tab === "sales" ? <AdminQuotesListClient /> : <AdminOohQuotesClient />}
    </div>
  );
}
