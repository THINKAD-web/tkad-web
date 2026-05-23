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
  Building2,
  KeyRound,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";
import { ProTrialBanner, type ProTrialStatus } from "@/components/my/pro-trial-banner";
import { PointsCheckInCard } from "@/components/my/points-check-in-card";
import { PointsHistoryTab } from "@/components/my/points-history-tab";
import { TeamManagementSection } from "@/components/my/team-management-section";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { MyHubTabs, type MyHubTab } from "@/components/my/my-hub-tabs";
import {
  MyHubMediaGridCard,
  type MyHubMediaItem,
} from "@/components/my/my-hub-media-grid-card";
import { AdvertiserCampaignCard } from "@/components/advertiser-dashboard/campaign-card";
import { NeonFullPageSpinner } from "@/components/ui/neon-page-spinner";
import { Spinner, EmptyState } from "@/components/ui/spinner";
import {
  myHubFilterPill,
  myHubGlassCard,
  myHubOutlineBtn,
  myHubPrimaryBtn,
} from "@/lib/my-hub-ui";
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
import { MobileMyHubView } from "@/components/mobile/mobile-my-hub-view";

type Me = {
  id: string;
  email: string;
  name: string;
  role: string;
  needsEmailVerification?: boolean;
  plan?: string;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  trialDaysLeft?: number;
  trialProgressPct?: number;
  pointBalance?: number;
  createdAt?: string | null;
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

function parseHubTab(value: string | null): MyHubTab | null {
  if (
    value === "campaigns" ||
    value === "favorites" ||
    value === "planner" ||
    value === "recent" ||
    value === "team" ||
    value === "points"
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

  const [inquiryCount, setInquiryCount] = useState(0);

  const reloadMe = useCallback(async () => {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    const data = await res.json();
    if (data.ok && data.data) setMe(data.data);
  }, []);

  const reloadMobileStats = useCallback(async () => {
    await reloadMe();
    try {
      const [favRes, planRes, bookingRes] = await Promise.all([
        fetch("/api/my/favorites", { cache: "no-store" }),
        fetch("/api/my/planner-plans", { cache: "no-store" }),
        fetch("/api/my/booking-requests", { cache: "no-store" }),
      ]);
      const favData = await favRes.json();
      const planData = await planRes.json();
      const bookingData = await bookingRes.json();
      if (favData.ok && Array.isArray(favData.data)) {
        setFavorites(favData.data);
      }
      if (planData.ok && Array.isArray(planData.data)) {
        setPlannerPlans(planData.data);
      }
      if (bookingData.ok && Array.isArray(bookingData.data)) {
        setInquiryCount(bookingData.data.length);
      }
    } catch {
      /* non-fatal */
    }
  }, [reloadMe]);

  const tabDefs = useMemo(
    () => [
      { key: "campaigns" as const, label: t("tabs.campaigns"), icon: Megaphone },
      { key: "favorites" as const, label: t("tabs.favorites"), icon: Heart },
      { key: "planner" as const, label: t("tabs.planner"), icon: LayoutList },
      { key: "recent" as const, label: t("tabs.recent"), icon: Clock },
      { key: "points" as const, label: t("tabs.points"), icon: Sparkles },
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
    void reloadMobileStats();
  }, [me, reloadMobileStats]);

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
    return <NeonFullPageSpinner label={t("loading")} portal />;
  }

  const plannerPlannerHref = buildPlannerHrefWithMediaIds(
    favorites.map((f) => f.id),
  );

  return (
    <>
      <MobileMyHubView
        me={me}
        stats={{
          favorites: favorites.length,
          inquiries: inquiryCount,
          plans: plannerPlans.length,
        }}
        isKo={isKo}
        onRefresh={reloadMobileStats}
        onLogout={logout}
      />

      <HomeLandingDayNight portal>
      <div className="tkad-landing-neon tkad-planner-neon tkad-portal-shell hidden min-h-[calc(100dvh-4rem)] md:block">
        <section className="tkad-home-hero tkad-category-explore-hero relative overflow-hidden bg-gray-50 py-14 text-gray-900 dark:bg-[#05050a] dark:text-white sm:py-20 lg:py-24">
          <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
          <div aria-hidden className="absolute inset-0 opacity-20 tkad-neon-grid" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.1),rgba(0,0,0,0.55),rgba(0,0,0,0.92))]"
          />
          <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-400/60">
                {isKo ? "// 마이 허브" : "// My hub"}
              </p>
              <h1 className="mt-3 text-[clamp(2rem,4vw,3.25rem)] font-[950] leading-[0.95] tracking-[-0.05em] dark:text-white text-gray-900">
                {t("greeting", { name: me.name })}
              </h1>
              <p className="mt-3 truncate text-base dark:text-white text-gray-600 sm:text-lg">
                {me.email}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
              {me.role === "owner" || me.role === "admin" ? (
                <Link href="/media-owner/dashboard" className={myHubOutlineBtn}>
                  <Building2 className="h-4 w-4" />
                  {isKo ? "매체사 포털" : "Media portal"}
                </Link>
              ) : null}
              <Link href="/my/api-keys" className={myHubOutlineBtn}>
                <KeyRound className="h-4 w-4" />
                {isKo ? "API 키" : "API keys"}
              </Link>
              <Link href="/my/settings" className={myHubOutlineBtn}>
                <Settings className="h-4 w-4" />
                {isKo ? "설정" : "Settings"}
              </Link>
              <button type="button" onClick={logout} className={myHubOutlineBtn}>
                <LogOut className="h-4 w-4" />
                {t("logout")}
              </button>
            </div>
          </div>
        </section>

        <section className="py-8 sm:py-12 lg:py-14">
          <div className="relative mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:space-y-10 lg:px-8">
          {me.needsEmailVerification && <EmailVerificationBanner />}

          {me.plan === "PRO_TRIAL" && (me.trialDaysLeft ?? 0) > 0 && (
            <ProTrialBanner
              trial={{
                plan: me.plan,
                trialStartedAt: me.trialStartedAt ?? null,
                trialEndsAt: me.trialEndsAt ?? null,
                daysLeft: me.trialDaysLeft ?? 0,
                progressPct: me.trialProgressPct ?? 0,
              }}
              isKo={isKo}
            />
          )}

          <PointsCheckInCard />

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
                        myHubFilterPill(campaignFilter === key),
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
                    <Link href="/media" className={myHubPrimaryBtn}>
                      {t("campaigns.emptyCta")}
                    </Link>
                  }
                />
              ) : (
                <ul className="space-y-4">
                  {campaigns.map((c) => (
                    <li key={c.id}>
                      <AdvertiserCampaignCard
                        item={{
                          id: c.id,
                          name: c.name,
                          status: c.status,
                          startDate: c.startDate,
                          endDate: c.endDate,
                          mediaNames: c.mediaNames,
                          impressionsTotal: c.impressionsTotal,
                          proofThumbUrl: null,
                          proofCount: 0,
                          latestProofAt: null,
                        }}
                        isKo={isKo}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === "favorites" && (
            <section aria-labelledby="my-favorites-heading">
              <div className="tkad-neon-surface relative mb-8 overflow-hidden rounded-[28px] px-6 py-8 sm:px-8 sm:py-10">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-400/80">
                  {isKo ? "// 찜한 매체" : "// Saved media"}
                </p>
                <h2
                  id="my-favorites-heading"
                  className="mt-3 text-balance text-2xl font-[950] leading-tight tracking-[-0.05em] text-foreground sm:text-3xl"
                >
                  {isKo ? (
                    <>
                      관심 매체를{" "}
                      <span className="tkad-home-accent-text">플래너</span>에 담아보세요
                    </>
                  ) : (
                    <>
                      Add saved media to your{" "}
                      <span className="tkad-home-accent-text">planner</span>
                    </>
                  )}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {isKo
                    ? "관심 매체를 모아 플래너·견적으로 이어가세요."
                    : "Collect saved placements and move into planner or quotes."}
                </p>
              </div>
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
                    <Link href="/media" className={myHubPrimaryBtn}>
                      {t("favorites.emptyCta")}
                    </Link>
                  }
                />
              ) : (
                <>
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                    <Link href={plannerPlannerHref} className={myHubPrimaryBtn}>
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
                      <Link href="/planner" className={myHubPrimaryBtn}>
                        {t("planner.emptyCta")}
                      </Link>
                      <Link href="/proposal" className={myHubOutlineBtn}>
                        {t("planner.emptyProposalCta")}
                      </Link>
                    </div>
                  }
                />
              ) : (
                <div className="space-y-8">
                  {proposals.length > 0 ? (
                    <div>
                      <h3 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                        {t("planner.proposalsSection")}
                      </h3>
                      <ul className="space-y-3">
                        {proposals.map((p) => (
                          <li key={p.id} className={myHubGlassCard}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-base font-bold text-foreground">
                                  {p.campaignName}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {p.brandName}
                                </p>
                                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                                  {isKo
                                    ? `예산 ${p.budgetManwon.toLocaleString("ko-KR")}만원`
                                    : `Budget ${p.budgetManwon.toLocaleString("en-US")}×10k KRW`}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-wrap gap-2">
                                <Link
                                  href={`/proposal/${p.id}`}
                                  className={myHubOutlineBtn}
                                >
                                  {t("planner.viewProposal")}
                                </Link>
                                <Link
                                  href={`/contact?proposal=${p.id}`}
                                  className={myHubPrimaryBtn}
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
                      <h3 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                        {t("planner.plansSection")}
                      </h3>
                      <ul className="space-y-3">
                  {plannerPlans.map((plan) => (
                    <li key={plan.id} className={myHubGlassCard}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold text-foreground">
                            {plan.title}
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                            {isKo
                              ? `총 예산 ${plan.budgetManwon.toLocaleString("ko-KR")}만원 · 매체 ${plan.mediaCount}개`
                              : `Budget ${plan.budgetManwon.toLocaleString("en-US")}×10k KRW · ${plan.mediaCount} media`}
                          </p>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
                            {new Date(plan.createdAt).toLocaleDateString(
                              isKo ? "ko-KR" : "en-US",
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Link
                            href={`/planner?loadPlan=${plan.id}`}
                            className={myHubOutlineBtn}
                          >
                            {t("planner.continueEdit")}
                          </Link>
                          <Link
                            href={`/contact?plan=${plan.id}`}
                            className={myHubPrimaryBtn}
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

          {tab === "points" && (
            <section aria-labelledby="my-points-heading">
              <h2 id="my-points-heading" className="sr-only">
                {t("tabs.points")}
              </h2>
              <PointsHistoryTab />
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
                    <Link href="/media" className={myHubPrimaryBtn}>
                      {t("recent.emptyCta")}
                    </Link>
                  }
                />
              ) : (
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {recentItems.map((m) => (
                    <MyHubMediaGridCard key={m.id} item={m} isKo={isKo} />
                  ))}
                </ul>
              )}
            </section>
          )}
          </div>
        </section>
      </div>
    </HomeLandingDayNight>
    </>
  );
}
