"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Bell, FileText, Film, ListMusic, LogOut, Megaphone } from "lucide-react";
import { FullPageSpinner } from "@/components/ui/spinner";
import { AdvertiserSummaryCards } from "@/components/advertiser-dashboard/summary-cards";
import {
  AdvertiserCampaignCard,
  type AdvertiserCampaignCardItem,
} from "@/components/advertiser-dashboard/campaign-card";
import type { CampaignTab } from "@/lib/advertiser-campaign-metrics";

type Me = { id: string; email: string; name: string } | null;

type Summary = {
  activeCount: number;
  monthImpressions: number;
  totalSpendWon: number;
  nextEndDate: string | null;
};

type InquiryItem = {
  id: string;
  kind: string;
  date: string;
  title: string;
  body: string;
  status: string;
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  campaignId?: string;
  dueDate?: string;
};

const TABS: { key: CampaignTab; ko: string; en: string }[] = [
  { key: "active", ko: "진행중", en: "Active" },
  { key: "upcoming", ko: "예정", en: "Upcoming" },
  { key: "completed", ko: "완료", en: "Done" },
];

export default function AdvertiserDashboardPage() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<CampaignTab>("active");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [campaigns, setCampaigns] = useState<AdvertiserCampaignCardItem[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [section, setSection] = useState<"campaigns" | "inquiries" | "alerts">(
    "campaigns",
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const data = await res.json();
      if (cancelled) return;
      if (!data.ok || !data.data) {
        router.replace("/login?redirect=/dashboard");
        return;
      }
      setMe(data.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    (async () => {
      const [sRes, nRes, iRes] = await Promise.all([
        fetch("/api/my/dashboard/summary", { cache: "no-store" }),
        fetch("/api/my/dashboard/notifications", { cache: "no-store" }),
        fetch("/api/my/dashboard/inquiries", { cache: "no-store" }),
      ]);
      if (cancelled) return;
      const sJson = await sRes.json();
      const nJson = await nRes.json();
      const iJson = await iRes.json();
      if (sJson.ok) setSummary(sJson.data);
      if (nJson.ok) setNotifications(nJson.data.items);
      if (iJson.ok) setInquiries(iJson.data.items);
    })();
    return () => {
      cancelled = true;
    };
  }, [me]);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    setCampaignsLoading(true);
    (async () => {
      const res = await fetch(
        `/api/my/dashboard/campaigns?tab=${encodeURIComponent(tab)}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!cancelled && data.ok) setCampaigns(data.data.items);
      if (!cancelled) setCampaignsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [me, tab]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = `/${locale}/login`;
  }

  if (loading || !me) {
    return <FullPageSpinner label={isKo ? "대시보드 불러오는 중…" : "Loading dashboard…"} />;
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg px-4 pb-28 pt-5 sm:max-w-2xl sm:pt-8 lg:max-w-4xl">
      <header className="mb-6 flex items-start justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary">
            {isKo ? "광고주 포털" : "Advertiser portal"}
          </p>
          <h1 className="mt-1 truncate text-xl font-black tracking-tight">
            {me.name}
          </h1>
          <p className="truncate text-xs text-muted-foreground">{me.email}</p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="shrink-0 rounded-full border border-border p-2.5 text-muted-foreground hover:bg-muted"
          aria-label={isKo ? "로그아웃" : "Log out"}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      {summary ? (
        <AdvertiserSummaryCards
          activeCount={summary.activeCount}
          monthImpressions={summary.monthImpressions}
          totalSpendWon={summary.totalSpendWon}
          nextEndDate={summary.nextEndDate}
          isKo={isKo}
        />
      ) : null}

      {/* 광고주 빠른 진입점 — 소재 관리 / 플레이리스트 */}
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link
          href="/creatives"
          className="flex items-center justify-center gap-1.5 rounded-[12px] border-2 border-border bg-card px-3 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          <Film className="h-3.5 w-3.5" />
          {isKo ? "소재 라이브러리" : "Library"}
        </Link>
        <Link
          href="/creatives/upload"
          className="flex items-center justify-center gap-1.5 rounded-[12px] border-2 border-border bg-card px-3 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          <Megaphone className="h-3.5 w-3.5" />
          {isKo ? "소재 업로드" : "Upload"}
        </Link>
        <Link
          href="/creatives/playlists"
          className="flex items-center justify-center gap-1.5 rounded-[12px] border-2 border-border bg-card px-3 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          <ListMusic className="h-3.5 w-3.5" />
          {isKo ? "플레이리스트" : "Playlists"}
        </Link>
        <Link
          href="/creatives/guide"
          className="flex items-center justify-center gap-1.5 rounded-[12px] border-2 border-border bg-card px-3 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
        >
          {isKo ? "규격 가이드" : "Specs"}
        </Link>
      </div>

      <nav className="mt-6 flex gap-2 border-b border-border pb-2">
        {(
          [
            { key: "campaigns" as const, icon: Megaphone, label: isKo ? "캠페인" : "Campaigns" },
            { key: "inquiries" as const, icon: FileText, label: isKo ? "견적·문의" : "Quotes" },
            { key: "alerts" as const, icon: Bell, label: isKo ? "알림" : "Alerts", badge: notifications.length },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setSection(item.key)}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-[12px] py-2.5 text-xs font-semibold transition-colors ${
              section === item.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground"
            }`}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
            {"badge" in item && item.badge ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                {item.badge > 9 ? "9+" : item.badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {section === "campaigns" ? (
        <section className="mt-4">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`shrink-0 rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] ${
                  tab === t.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {isKo ? t.ko : t.en}
              </button>
            ))}
          </div>
          {campaignsLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {isKo ? "불러오는 중…" : "Loading…"}
            </p>
          ) : campaigns.length === 0 ? (
            <p className="rounded-[16px] border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              {isKo ? "해당 상태의 캠페인이 없습니다." : "No campaigns in this tab."}
            </p>
          ) : (
            <ul className="space-y-3">
              {campaigns.map((c) => (
                <li key={c.id}>
                  <AdvertiserCampaignCard item={c} isKo={isKo} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {section === "inquiries" ? (
        <section className="mt-4 space-y-3">
          {inquiries.length === 0 ? (
            <p className="rounded-[16px] border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              {isKo ? "견적·문의 이력이 없습니다." : "No inquiry history."}
            </p>
          ) : (
            inquiries.map((row) => (
              <article
                key={`${row.kind}-${row.id}`}
                className="rounded-[16px] border border-border bg-card p-4 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{row.title}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {row.date.slice(0, 10)}
                  </span>
                </div>
                <p className="mt-2 text-muted-foreground">{row.body}</p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                  {row.status}
                </p>
              </article>
            ))
          )}
        </section>
      ) : null}

      {section === "alerts" ? (
        <section className="mt-4 space-y-3">
          {notifications.length === 0 ? (
            <p className="rounded-[16px] border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              {isKo ? "새 알림이 없습니다." : "No notifications."}
            </p>
          ) : (
            notifications.map((n) => (
              <article
                key={n.id}
                className="rounded-[16px] border border-border bg-card p-4"
              >
                <p className="font-semibold">{n.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                {n.campaignId ? (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/dashboard/campaigns/${n.campaignId}`)
                    }
                    className="mt-2 text-xs font-medium text-primary underline"
                  >
                    {isKo ? "캠페인 보기" : "View campaign"}
                  </button>
                ) : null}
              </article>
            ))
          )}
        </section>
      ) : null}
    </div>
  );
}
