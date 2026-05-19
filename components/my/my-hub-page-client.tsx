"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  Clock,
  Heart,
  LayoutList,
  LogOut,
  Megaphone,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";
import { TeamManagementSection } from "@/components/my/team-management-section";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { MyHubTabs, type MyHubTab } from "@/components/my/my-hub-tabs";
import {
  MyHubMediaGridCard,
  type MyHubMediaItem,
} from "@/components/my/my-hub-media-grid-card";
import { FullPageSpinner, Spinner, EmptyState } from "@/components/ui/spinner";
import { useAppToast } from "@/lib/use-toast";
import type { CampaignTab } from "@/lib/advertiser-campaign-metrics";
import type { CampaignStatus } from "@prisma/client";
import { buildPlannerHrefWithMediaIds } from "@/lib/planner-media-href";
import {
  fetchRecentlyViewedItems,
  readRecentlyViewedRecords,
  subscribeRecentlyViewedChanged,
} from "@/lib/recently-viewed";
import { syncRecentlyViewedWithServer } from "@/lib/recently-viewed-sync";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import { cn } from "@/lib/utils";

type Me = {
  id: string;
  email: string;
  name: string;
  role: string;
  needsEmailVerification?: boolean;
};

type CampaignItem = {
  id: string;
  name: string;
  status: CampaignStatus;
  tab: CampaignTab;
  startDate: string | null;
  endDate: string | null;
  mediaNames: string[];
  impressionsTotal: number;
};

type PlannerPlanItem = {
  id: string;
  createdAt: string;
  expiresAt: string;
  title: string;
  budgetManwon: number;
  mediaCount: number;
  isTeamShared?: boolean;
};

type ProposalItem = {
  id: string;
  brandName: string;
  campaignName: string;
  createdAt: string;
  expiresAt: string;
  budgetManwon: number;
};

const STATUS_LABEL: Record<string, { ko: string; en: string }> = {
  proposal: { ko: "제안", en: "Proposal" },
  negotiation: { ko: "협의", en: "Negotiation" },
  contract: { ko: "계약", en: "Contract" },
  production: { ko: "제작", en: "Production" },
  airing: { ko: "집행 중", en: "Live" },
  completed: { ko: "완료", en: "Done" },
};

const TAB_FILTER_LABEL: Record<CampaignTab, { ko: string; en: string }> = {
  active: { ko: "진행중", en: "Active" },
  completed: { ko: "완료", en: "Completed" },
  upcoming: { ko: "예정", en: "Upcoming" },
};

const glassCard =
  "rounded-2xl border border-white/12 bg-white/5 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur sm:p-5";

const gradientBtn =
  "inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(124,58,237,0.35)] transition-opacity hover:opacity-95";

const outlineBtn =
  "inline-flex items-center justify-center rounded-xl border border-white/18 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10";

function parseHubTab(value: string | null): MyHubTab | null {
  if (
    value === "campaigns" ||
    value === "favorites" ||
    value === "planner" ||
    value === "recent" ||
    value === "team"
  ) {
    return value;
  }
  return null;
}

export function MyHubPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const isKo = locale === "ko";
  const t = useTranslations("myHub");
  const toast = useAppToast();

  const [me, setMe] = useState<Me | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [tab, setTab] = useState<MyHubTab>(
    () => parseHubTab(searchParams.get("tab")) ?? "campaigns",
  );

  useEffect(() => {
    const fromUrl = parseHubTab(searchParams.get("tab"));
    if (fromUrl) setTab(fromUrl);
  }, [searchParams]);

  const onTabChange = useCallback(
    (next: MyHubTab) => {
      setTab(next);
      router.replace(`/my?tab=${next}`, { scroll: false });
    },
    [router],
  );

  const [campaignFilter, setCampaignFilter] = useState<CampaignTab>("active");
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  const [favorites, setFavorites] = useState<MyHubMediaItem[]>([]);
  const [favLoading, setFavLoading] = useState(false);

  const [plannerPlans, setPlannerPlans] = useState<PlannerPlanItem[]>([]);
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [plannerLoading, setPlannerLoading] = useState(false);

  const [recentItems, setRecentItems] = useState<MyHubMediaItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const tabDefs = useMemo(
    () => [
      { key: "campaigns" as const, label: t("tabs.campaigns"), icon: Megaphone },
      { key: "favorites" as const, label: t("tabs.favorites"), icon: Heart },
      { key: "planner" as const, label: t("tabs.planner"), icon: LayoutList },
      { key: "recent" as const, label: t("tabs.recent"), icon: Clock },
      { key: "team" as const, label: t("tabs.team"), icon: Users },
    ],
    [t],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!data.ok || !data.data) {
          router.replace("/login?redirect=/my");
          return;
        }
        setMe(data.data);
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    setCampaignsLoading(true);
    (async () => {
      const res = await fetch(
        `/api/my/dashboard/campaigns?tab=${encodeURIComponent(campaignFilter)}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!cancelled && data.ok) setCampaigns(data.data.items);
      if (!cancelled) setCampaignsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [me, campaignFilter]);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    setFavLoading(true);
    (async () => {
      const res = await fetch("/api/my/favorites", { cache: "no-store" });
      const data = await res.json();
      if (!cancelled && data.ok) setFavorites(data.data.items);
      if (!cancelled) setFavLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [me]);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    setPlannerLoading(true);
    (async () => {
      const [planRes, propRes] = await Promise.all([
        fetch(`/api/my/planner-plans?locale=${encodeURIComponent(locale)}`, {
          cache: "no-store",
        }),
        fetch("/api/my/proposals", { cache: "no-store" }),
      ]);
      const planData = await planRes.json();
      const propData = await propRes.json();
      if (!cancelled && planData.ok) setPlannerPlans(planData.data.items);
      if (!cancelled && propData.ok) setProposals(propData.data.items);
      if (!cancelled) setPlannerLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [me, locale]);

  const loadRecent = useCallback(async () => {
    setRecentLoading(true);
    try {
      await syncRecentlyViewedWithServer();
      const items = await fetchRecentlyViewedItems();
      if (items.length > 0) {
        setRecentItems(
          items.map((m) => ({
            id: m.id,
            name: m.name,
            region: m.region,
            type: m.type,
            price: catalogPriceFieldToWon(m.price ?? 0),
            image: m.sampleImages?.[0] ?? null,
          })),
        );
        return;
      }
      setRecentItems(
        readRecentlyViewedRecords().map((r) => ({
          id: r.id,
          name: r.name,
          region: r.region,
          type: r.type,
          price: catalogPriceFieldToWon(r.price),
          image: r.thumbnail || null,
        })),
      );
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!me) return;
    loadRecent();
    const unsub = subscribeRecentlyViewedChanged(() => loadRecent());
    return unsub;
  }, [me, loadRecent]);

  async function removeFavorite(mediaId: string) {
    const target = favorites.find((f) => f.id === mediaId);
    const res = await fetch("/api/my/favorite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaId, action: "remove" }),
    });
    if (res.ok) {
      setFavorites((prev) => prev.filter((f) => f.id !== mediaId));
      toast.warning(
        target
          ? isKo
            ? `${target.name}을(를) 찜 목록에서 제거했습니다.`
            : `Removed ${target.name} from favorites.`
          : isKo
            ? "찜 목록에서 제거했습니다."
            : "Removed from favorites.",
      );
    } else {
      toast.error(
        isKo ? "제거에 실패했습니다." : "Could not remove favorite.",
      );
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    window.location.href = `/${locale}/login`;
  }

  if (meLoading || !me) {
    return <FullPageSpinner label={t("loading")} />;
  }

  const plannerPlannerHref = buildPlannerHrefWithMediaIds(
    favorites.map((f) => f.id),
  );

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon min-h-[calc(100vh-72px)] px-4 py-8 sm:px-6 sm:py-10">
        <div className="relative mx-auto max-w-5xl">
          <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                [ MY HUB ]
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                {t("greeting", { name: me.name })}
              </h1>
              <p className="mt-1 truncate font-mono text-[11px] tracking-tight text-white/45">
                {`// `}
                {me.email}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/my/settings" className={cn(outlineBtn, "gap-1.5")}>
                <Settings className="h-4 w-4" />
                {isKo ? "설정" : "Settings"}
              </Link>
              <button
                type="button"
                onClick={logout}
                className={cn(outlineBtn, "gap-1.5")}
              >
                <LogOut className="h-4 w-4" />
                {t("logout")}
              </button>
            </div>
          </header>

          {me.needsEmailVerification && (
            <EmailVerificationBanner className="mb-6" />
          )}

          <MyHubTabs
            tabs={tabDefs}
            active={tab}
            onChange={onTabChange}
            counts={{
              favorites: favorites.length,
              planner: plannerPlans.length,
              recent: recentItems.length,
            }}
          />

          {tab === "campaigns" && (
            <section aria-labelledby="my-campaigns-heading">
              <div className="mb-4 flex flex-wrap gap-2">
                {(["active", "upcoming", "completed"] as CampaignTab[]).map(
                  (key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCampaignFilter(key)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition-colors",
                        campaignFilter === key
                          ? "border-violet-400/50 bg-violet-500/20 text-white"
                          : "border-white/12 bg-white/5 text-white/60 hover:text-white/85",
                      )}
                    >
                      {TAB_FILTER_LABEL[key][isKo ? "ko" : "en"]}
                    </button>
                  ),
                )}
              </div>
              <h2 id="my-campaigns-heading" className="sr-only">
                {t("tabs.campaigns")}
              </h2>
              {campaignsLoading ? (
                <div className="py-16 text-center">
                  <Spinner size="md" label={t("campaigns.loading")} />
                </div>
              ) : campaigns.length === 0 ? (
                <EmptyState
                  icon="🚀"
                  title={t("campaigns.emptyTitle")}
                  description={t("campaigns.emptyDesc")}
                  action={
                    <Link href="/media" className={gradientBtn}>
                      {t("campaigns.emptyCta")}
                    </Link>
                  }
                />
              ) : (
                <ul className="space-y-3">
                  {campaigns.map((c) => (
                    <CampaignHubCard key={c.id} item={c} isKo={isKo} t={t} />
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === "favorites" && (
            <section aria-labelledby="my-favorites-heading">
              <h2 id="my-favorites-heading" className="sr-only">
                {t("tabs.favorites")}
              </h2>
              {favLoading ? (
                <div className="py-16 text-center">
                  <Spinner size="md" label={t("favorites.loading")} />
                </div>
              ) : favorites.length === 0 ? (
                <EmptyState
                  icon="⭐"
                  title={t("favorites.emptyTitle")}
                  description={t("favorites.emptyDesc")}
                  action={
                    <Link href="/media" className={gradientBtn}>
                      {t("favorites.emptyCta")}
                    </Link>
                  }
                />
              ) : (
                <>
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {favorites.map((m) => (
                      <MyHubMediaGridCard
                        key={m.id}
                        item={m}
                        isKo={isKo}
                        onRemove={removeFavorite}
                      />
                    ))}
                  </ul>
                  <div className="mt-6 flex justify-center">
                    <Link href={plannerPlannerHref} className={gradientBtn}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {t("favorites.plannerCta")}
                    </Link>
                  </div>
                </>
              )}
            </section>
          )}

          {tab === "planner" && (
            <section aria-labelledby="my-planner-heading">
              <h2 id="my-planner-heading" className="sr-only">
                {t("tabs.planner")}
              </h2>
              {plannerLoading ? (
                <div className="py-16 text-center">
                  <Spinner size="md" label={t("planner.loading")} />
                </div>
              ) : plannerPlans.length === 0 && proposals.length === 0 ? (
                <EmptyState
                  icon="📋"
                  title={t("planner.emptyTitle")}
                  description={t("planner.emptyDesc")}
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      <Link href="/planner" className={gradientBtn}>
                        {t("planner.emptyCta")}
                      </Link>
                      <Link href="/proposal" className={outlineBtn}>
                        {t("planner.emptyProposalCta")}
                      </Link>
                    </div>
                  }
                />
              ) : (
                <div className="space-y-8">
                  {proposals.length > 0 ? (
                    <div>
                      <h3 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-violet-300">
                        {t("planner.proposalsSection")}
                      </h3>
                      <ul className="space-y-3">
                        {proposals.map((p) => (
                          <li key={p.id} className={glassCard}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-base font-bold text-white">
                                  {p.campaignName}
                                </p>
                                <p className="mt-1 text-sm text-white/60">
                                  {p.brandName}
                                </p>
                                <p className="mt-1 font-mono text-[11px] text-white/55">
                                  {isKo
                                    ? `예산 ${p.budgetManwon.toLocaleString("ko-KR")}만원`
                                    : `Budget ${p.budgetManwon.toLocaleString("en-US")}×10k KRW`}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-wrap gap-2">
                                <Link
                                  href={`/proposal/${p.id}`}
                                  className={outlineBtn}
                                >
                                  {t("planner.viewProposal")}
                                </Link>
                                <Link
                                  href={`/contact?proposal=${p.id}`}
                                  className={gradientBtn}
                                >
                                  {t("planner.requestQuote")}
                                </Link>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {plannerPlans.length > 0 ? (
                    <div>
                      <h3 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">
                        {t("planner.plansSection")}
                      </h3>
                      <ul className="space-y-3">
                  {plannerPlans.map((plan) => (
                    <li key={plan.id} className={glassCard}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold text-white">
                            {plan.title}
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-white/55">
                            {isKo
                              ? `총 예산 ${plan.budgetManwon.toLocaleString("ko-KR")}만원 · 매체 ${plan.mediaCount}개`
                              : `Budget ${plan.budgetManwon.toLocaleString("en-US")}×10k KRW · ${plan.mediaCount} media`}
                          </p>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
                            {new Date(plan.createdAt).toLocaleDateString(
                              isKo ? "ko-KR" : "en-US",
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Link
                            href={`/planner?loadPlan=${plan.id}`}
                            className={outlineBtn}
                          >
                            {t("planner.continueEdit")}
                          </Link>
                          <Link
                            href={`/contact?plan=${plan.id}`}
                            className={gradientBtn}
                          >
                            {t("planner.requestQuote")}
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          )}

          {tab === "team" && (
            <section aria-labelledby="my-team-heading">
              <TeamManagementSection />
            </section>
          )}

          {tab === "recent" && (
            <section aria-labelledby="my-recent-heading">
              <h2 id="my-recent-heading" className="sr-only">
                {t("tabs.recent")}
              </h2>
              {recentLoading ? (
                <div className="py-16 text-center">
                  <Spinner size="md" label={t("recent.loading")} />
                </div>
              ) : recentItems.length === 0 ? (
                <EmptyState
                  icon="👀"
                  title={t("recent.emptyTitle")}
                  description={t("recent.emptyDesc")}
                  action={
                    <Link href="/media" className={gradientBtn}>
                      {t("recent.emptyCta")}
                    </Link>
                  }
                />
              ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {recentItems.map((m) => (
                    <MyHubMediaGridCard key={m.id} item={m} isKo={isKo} />
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
    </HomeLandingDayNight>
  );
}

function CampaignHubCard({
  item,
  isKo,
  t,
}: {
  item: CampaignItem;
  isKo: boolean;
  t: ReturnType<typeof useTranslations<"myHub">>;
}) {
  const period =
    item.startDate && item.endDate
      ? `${item.startDate} ~ ${item.endDate}`
      : item.startDate ?? "—";
  const mediaLabel =
    item.mediaNames.length > 0
      ? item.mediaNames.slice(0, 2).join(", ") +
        (item.mediaNames.length > 2
          ? ` +${item.mediaNames.length - 2}`
          : "")
      : isKo
        ? "매체 배정 전"
        : "Media TBD";
  const status =
    STATUS_LABEL[item.status]?.[isKo ? "ko" : "en"] ?? item.status;
  const tabBadge = TAB_FILTER_LABEL[item.tab][isKo ? "ko" : "en"];

  return (
    <li className={glassCard}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-white">{item.name}</p>
          <p className="mt-1 truncate text-sm text-white/65">{mediaLabel}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
            {period}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-400/35 bg-cyan-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-200">
              {tabBadge}
            </span>
            <span className="rounded-full border border-white/15 bg-white/8 px-2.5 py-0.5 text-[10px] font-semibold text-white/80">
              {status}
            </span>
            <span className="font-mono text-[10px] tabular-nums text-white/50">
              {isKo ? "노출 " : "Imp "}
              {item.impressionsTotal.toLocaleString(isKo ? "ko-KR" : "en-US")}
              {isKo ? " (추정)" : " (est.)"}
            </span>
          </div>
        </div>
        <Link
          href={`/dashboard/campaigns/${item.id}`}
          className={cn(outlineBtn, "shrink-0")}
        >
          {t("campaigns.viewDetail")}
        </Link>
      </div>
    </li>
  );
}
