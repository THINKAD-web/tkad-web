"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Bell, FileText, Film, ListMusic, LogOut, Megaphone } from "lucide-react";
import { NeonFullPageSpinner } from "@/components/ui/neon-page-spinner";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { AdvertiserSummaryCards } from "@/components/advertiser-dashboard/summary-cards";
import {
  AdvertiserCampaignCard,
  type AdvertiserCampaignCardItem,
} from "@/components/advertiser-dashboard/campaign-card";
import type { CampaignTab } from "@/lib/advertiser-campaign-metrics";
import { cn } from "@/lib/utils";

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

const QUICK_LINKS = [
  { href: "/creatives", icon: Film, ko: "소재 라이브러리", en: "Library" },
  { href: "/creatives/upload", icon: Megaphone, ko: "소재 업로드", en: "Upload" },
  { href: "/creatives/playlists", icon: ListMusic, ko: "플레이리스트", en: "Playlists" },
  { href: "/creatives/guide", icon: FileText, ko: "규격 가이드", en: "Specs", muted: true },
] as const;

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
    return (
      <NeonFullPageSpinner
        label={isKo ? "대시보드 불러오는 중…" : "Loading dashboard…"}
      />
    );
  }

  const sectionNav = [
    {
      key: "campaigns" as const,
      icon: Megaphone,
      label: isKo ? "캠페인" : "Campaigns",
    },
    {
      key: "inquiries" as const,
      icon: FileText,
      label: isKo ? "견적·문의" : "Quotes",
    },
    {
      key: "alerts" as const,
      icon: Bell,
      label: isKo ? "알림" : "Alerts",
      badge: notifications.length,
    },
  ];

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon min-h-[calc(100vh-72px)]">
        <section className="tkad-home-hero tkad-neon-surface relative overflow-hidden bg-[#05050a] py-16 text-white sm:py-20 lg:py-24">
          <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
          <div aria-hidden className="absolute inset-0 opacity-20 tkad-neon-grid" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.1),rgba(0,0,0,0.55),rgba(0,0,0,0.92))]"
          />
          <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-white/55">
                {isKo ? "// 광고주 포털" : "// Advertiser portal"}
              </p>
              <h1 className="mt-3 text-[clamp(2rem,4vw,3.25rem)] font-[950] leading-[0.95] tracking-[-0.05em] text-white">
                {me.name}
              </h1>
              <p className="mt-3 truncate text-base text-white/65 sm:text-lg">
                {me.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-[18px] border border-white/14 bg-white/6 px-5 py-3 text-sm font-bold text-white/85 backdrop-blur transition-colors hover:border-white/25 hover:bg-white/10 lg:self-auto"
              aria-label={isKo ? "로그아웃" : "Log out"}
            >
              <LogOut className="h-4 w-4" />
              {isKo ? "로그아웃" : "Log out"}
            </button>
          </div>
        </section>

        <section className="py-8 sm:py-12 lg:py-14">
          <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:space-y-10 lg:px-8">
            {summary ? (
              <AdvertiserSummaryCards
                activeCount={summary.activeCount}
                monthImpressions={summary.monthImpressions}
                totalSpendWon={summary.totalSpendWon}
                nextEndDate={summary.nextEndDate}
                isKo={isKo}
              />
            ) : null}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {QUICK_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "tkad-glass-surface flex items-center justify-center gap-2 rounded-[22px] border px-4 py-4 font-mono text-xs font-bold uppercase tracking-[0.14em] backdrop-blur transition-all sm:py-5 sm:text-[13px]",
                    "text-foreground hover:-translate-y-0.5 hover:border-primary/30",
                    "muted" in item && item.muted && "text-muted-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {isKo ? item.ko : item.en}
                </Link>
              ))}
            </div>

            <nav className="tkad-glass-surface flex gap-2 rounded-[24px] border p-2 backdrop-blur">
              {sectionNav.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSection(item.key)}
                  className={cn(
                    "relative flex flex-1 items-center justify-center gap-2 rounded-[18px] py-3.5 text-sm font-bold transition-all sm:text-base",
                    section === item.key
                      ? "bg-primary/20 text-primary shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_8px_32px_rgba(34,211,238,0.12)]"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  {item.label}
                  {"badge" in item && item.badge ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </nav>

            {section === "campaigns" ? (
              <section>
                <div className="mb-5 flex flex-wrap gap-2">
                  {TABS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTab(t.key)}
                      className={cn(
                        "shrink-0 rounded-full border px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.16em] transition-all sm:px-5 sm:py-2.5 sm:text-[13px]",
                        tab === t.key
                          ? "border-primary/45 bg-primary/15 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground hover:border-primary/25 hover:text-foreground",
                      )}
                    >
                      {isKo ? t.ko : t.en}
                    </button>
                  ))}
                </div>
                {campaignsLoading ? (
                  <p className="py-16 text-center text-base text-muted-foreground">
                    {isKo ? "불러오는 중…" : "Loading…"}
                  </p>
                ) : campaigns.length === 0 ? (
                  <p className="rounded-[28px] border border-dashed border-border py-20 text-center text-base text-muted-foreground">
                    {isKo
                      ? "해당 상태의 캠페인이 없습니다."
                      : "No campaigns in this tab."}
                  </p>
                ) : (
                  <ul className="space-y-4">
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
              <section className="space-y-4">
                {inquiries.length === 0 ? (
                  <p className="rounded-[28px] border border-dashed border-border py-20 text-center text-base text-muted-foreground">
                    {isKo ? "견적·문의 이력이 없습니다." : "No inquiry history."}
                  </p>
                ) : (
                  inquiries.map((row) => (
                    <article
                      key={`${row.kind}-${row.id}`}
                      className="tkad-glass-surface rounded-[28px] border p-6 backdrop-blur-md sm:p-7"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-lg font-bold text-foreground">
                          {row.title}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {row.date.slice(0, 10)}
                        </span>
                      </div>
                      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                        {row.body}
                      </p>
                      <p className="mt-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                        {row.status}
                      </p>
                    </article>
                  ))
                )}
              </section>
            ) : null}

            {section === "alerts" ? (
              <section className="space-y-4">
                {notifications.length === 0 ? (
                  <p className="rounded-[28px] border border-dashed border-white/15 py-20 text-center text-base text-white/50">
                    {isKo ? "새 알림이 없습니다." : "No notifications."}
                  </p>
                ) : (
                  notifications.map((n) => (
                    <article
                      key={n.id}
                      className="tkad-glass-surface rounded-[28px] border p-6 backdrop-blur-md sm:p-7"
                    >
                      <p className="text-lg font-bold text-foreground">{n.title}</p>
                      <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                        {n.body}
                      </p>
                      {n.campaignId ? (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/dashboard/campaigns/${n.campaignId}`)
                          }
                          className="mt-4 text-sm font-bold text-primary underline-offset-2 hover:underline"
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
        </section>
      </div>
    </HomeLandingDayNight>
  );
}
