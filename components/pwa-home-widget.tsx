"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Megaphone, MessageSquarePlus, MapPin } from "lucide-react";
import { fetchRecentlyViewedItems } from "@/lib/recently-viewed";
import { cn } from "@/lib/utils";

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  tab: string;
};

function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaHomeWidget() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [show, setShow] = useState(false);
  const [recent, setRecent] = useState<
    { id: string; name: string; href: string }[]
  >([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);

  const load = useCallback(async () => {
    const items = (await fetchRecentlyViewedItems()).slice(0, 3);
    setRecent(
      items.map((m) => ({
        id: m.id,
        name: m.name,
        href: `/${locale}/media/${m.id}`,
      })),
    );
    try {
      const res = await fetch("/api/my/dashboard/summary", {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (json.ok && json.data?.campaigns) {
        const active = (json.data.campaigns as CampaignRow[]).filter(
          (c) => c.tab === "active" || c.tab === "upcoming",
        );
        setCampaigns(active.slice(0, 3));
      }
    } catch {
      /* guest */
    }
  }, [locale]);

  useEffect(() => {
    setShow(isStandalonePwa());
    if (isStandalonePwa()) void load();
  }, [load]);

  if (!show) return null;

  return (
    <section
      className={cn(
        "mx-auto mb-8 max-w-6xl rounded-2xl border border-white/12 bg-black/40 p-4 backdrop-blur",
      )}
    >
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/90">
        {isKo ? "앱 홈" : "App home"}
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white/80">
            <MapPin className="h-3.5 w-3.5" />
            {isKo ? "최근 본 매체" : "Recent media"}
          </p>
          {recent.length === 0 ? (
            <p className="text-xs text-white/45">{isKo ? "없음" : "None"}</p>
          ) : (
            <ul className="space-y-1">
              {recent.map((m) => (
                <li key={m.id}>
                  <Link
                    href={m.href}
                    className="block truncate text-sm text-cyan-200/90 hover:underline"
                  >
                    {m.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white/80">
            <Megaphone className="h-3.5 w-3.5" />
            {isKo ? "진행 중 캠페인" : "Active campaigns"}
          </p>
          {campaigns.length === 0 ? (
            <p className="text-xs text-white/45">
              {isKo ? "로그인 후 표시" : "Sign in to view"}
            </p>
          ) : (
            <ul className="space-y-1">
              {campaigns.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/${locale}/dashboard/campaigns/${c.id}`}
                    className="block truncate text-sm text-white/85 hover:underline"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col justify-end gap-2">
          <Link
            href={`/${locale}/contact`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-4 text-sm font-black text-white"
          >
            <MessageSquarePlus className="h-4 w-4" />
            {isKo ? "새 문의하기" : "New inquiry"}
          </Link>
          <Link
            href={`/${locale}/media/map`}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/15 bg-white/8 text-xs font-bold text-white/90"
          >
            {isKo ? "답사 모드 (지도)" : "Field survey map"}
          </Link>
        </div>
      </div>
    </section>
  );
}
