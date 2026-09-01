"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type TxItem = {
  id: string;
  amount: number;
  description: string;
  balanceAfter: number | null;
  createdAt: string;
};

export function PointsHistoryTab() {
  const t = useTranslations("points");
  const [items, setItems] = useState<TxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (next?: string) => {
    const qs = new URLSearchParams({ limit: "20" });
    if (next) qs.set("cursor", next);
    const res = await fetch(`/api/points/transactions?${qs}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || !data.ok) return { items: [] as TxItem[], nextCursor: null };
    return data.data as { items: TxItem[]; nextCursor: string | null };
  }, []);

  useEffect(() => {
    load().then((r) => {
      setItems(r.items);
      setCursor(r.nextCursor);
      setHasMore(Boolean(r.nextCursor));
      setLoading(false);
    });
  }, [load]);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const el = sentinelRef.current;
    const obs = new IntersectionObserver(async (entries) => {
      if (!entries[0]?.isIntersecting || !cursor) return;
      const next = await load(cursor);
      setItems((prev) => [...prev, ...next.items]);
      setCursor(next.nextCursor);
      setHasMore(Boolean(next.nextCursor));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [cursor, hasMore, load]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="tkad-type-label text-muted-foreground">
          {t("historyTitle")}
        </h2>
        <Link href="/points" className="tkad-type-title text-primary hover:underline">
          {t("shopLink")}
        </Link>
      </div>
      <div className="tkad-glass-surface divide-y divide-border/40 rounded-[24px] border">
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{t("historyEmpty")}</p>
        ) : (
          items.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{row.description}</p>
                <p className="tkad-type-note text-muted-foreground">
                  {new Date(row.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    "font-bold tabular-nums",
                    row.amount >= 0 ? "text-emerald-400" : "text-rose-400",
                  )}
                >
                  {row.amount >= 0 ? "+" : ""}
                  {row.amount.toLocaleString()}P
                </p>
                {row.balanceAfter != null ? (
                  <p className="tkad-type-note text-muted-foreground tabular-nums">
                    {row.balanceAfter.toLocaleString()}P
                  </p>
                ) : null}
              </div>
            </div>
          ))
        )}
        <div ref={sentinelRef} className="h-2" />
      </div>
    </div>
  );
}
