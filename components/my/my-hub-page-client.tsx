"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Sparkles } from "lucide-react";
import { PointsCheckInCard } from "@/components/my/points-check-in-card";
import { MyHubEmptyQuickActions } from "@/components/my/my-hub-empty-quick-actions";
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
import { usePlanCart } from "@/hooks/use-plan-cart";
import {
  legacyMyHubTabRedirect,
  parseMyHubPanelTab,
  type MyHubPanelTab,
} from "@/lib/my-hub-nav-config";

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

const TAB_FILTER_LABEL: Record<CampaignTab, { ko: string; en: string }> = {
  active: { ko: "진행중", en: "Active" },
  completed: { ko: "완료", en: "Completed" },
  upcoming: { ko: "예정", en: "Upcoming" },
};

export function MyHubPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const isKo = locale === "ko";
  const t = useTranslations("myHub");
  const tPlan = useTranslations("planNav");
  const tFav = useTranslations("favoritesNav");
  const toast = useAppToast();

  const tab: MyHubPanelTab =
    parseMyHubPanelTab(searchParams.get("tab")) ?? "campaigns";

  useEffect(() => {
    const legacy = legacyMyHubTabRedirect(searchParams.get("tab"));
    if (legacy) router.replace(legacy);
  }, [searchParams, router]);

  const [ready, setReady] = useState(false);
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
  const { cart: planCart } = usePlanCart();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const data = await res.json();
      if (!cancelled) {
        if (!data.ok || !data.data) {
          router.replace("/login?redirect=/my");
          return;
        }
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!ready) return;
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
  }, [ready, campaignFilter]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setFavLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/my/favorites", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data.ok && Array.isArray(data.data?.items)) {
          setFavorites(data.data.items);
        }
      } finally {
        if (!cancelled) setFavLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
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
  }, [ready, locale]);

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
    if (!ready) return;
    loadRecent();
    const unsub = subscribeRecentlyViewedChanged(() => loadRecent());
    return unsub;
  }, [ready, loadRecent]);

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

  if (!ready) {
    return <NeonFullPageSpinner label={t("loading")} />;
  }

  const plannerPlannerHref = buildPlannerHrefWithMediaIds(
    favorites.map((f) => f.id),
  );

  return (
    <>
      {tab === "campaigns" ? <PointsCheckInCard /> : null}

      {tab === "campaigns" && (
        <section aria-labelledby="my-campaigns-heading">
          <div className="mb-5">
            <h2
              id="my-campaigns-heading"
              className="text-xl font-[950] tracking-tight text-foreground sm:text-2xl"
            >
              {t("tabs.campaigns")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isKo
                ? "진행 중인 캠페인과 완료·예정 일정을 한곳에서 확인하세요."
                : "Track active, upcoming, and completed campaigns."}
            </p>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {(["active", "upcoming", "completed"] as CampaignTab[]).map(
              (key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCampaignFilter(key)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 font-display text-xs font-medium uppercase tracking-[0.14em] transition-colors",
                    myHubFilterPill(campaignFilter === key),
                  )}
                >
                  {TAB_FILTER_LABEL[key][isKo ? "ko" : "en"]}
                </button>
              ),
            )}
          </div>
          {campaignsLoading ? (
            <div className="py-16 text-center">
              <Spinner size="md" label={t("campaigns.loading")} />
            </div>
          ) : campaigns.length === 0 ? (
            <>
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
              <MyHubEmptyQuickActions isKo={isKo} />
            </>
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
          <div className="relative mb-6 overflow-hidden rounded-[28px] border border-border bg-card px-5 py-6 sm:px-8 sm:py-10">
            <p className="font-display text-xs font-medium uppercase tracking-[0.24em] text-[color:var(--qp-fg-muted)]">
              {`// ${tFav("label")}`}
            </p>
            <h2
              id="my-favorites-heading"
              className="mt-3 text-balance text-xl font-[950] leading-tight tracking-[-0.05em] text-foreground sm:text-3xl"
            >
              {isKo ? (
                <>
                  관심 매체를{" "}
                  <span className="tkad-home-accent-text">플래너</span>에
                  담아보세요
                </>
              ) : (
                <>
                  Add saved media to your{" "}
                  <span className="tkad-home-accent-text">planner</span>
                </>
              )}
            </h2>
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
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          {planCart.items.length > 0 ? (
            <div className={cn(myHubGlassCard, "mb-6")}>
              <p className="text-sm font-bold text-foreground">
                {isKo
                  ? `담은 매체 ${planCart.items.length}개`
                  : `${planCart.items.length} media in your plan`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isKo
                  ? "「미디어 플랜 담기」로 추가한 매체입니다."
                  : "Media added via “Add to plan”."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/my/plan" className={myHubOutlineBtn}>
                  {tPlan("cart")}
                </Link>
                <Link href="/my/plan/report" className={myHubPrimaryBtn}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isKo ? "보고서 생성" : "Generate report"}
                </Link>
              </div>
            </div>
          ) : null}
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
                  <h3 className="mb-3 font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
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
                  <h3 className="mb-3 font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
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
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {isKo
                                ? `매체 ${plan.mediaCount}개 · 위저드에서 저장`
                                : `${plan.mediaCount} media · saved from wizard`}
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
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentItems.map((m) => (
                <MyHubMediaGridCard key={m.id} item={m} isKo={isKo} />
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
