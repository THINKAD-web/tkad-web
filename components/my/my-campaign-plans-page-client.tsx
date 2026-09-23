"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { MOBILE_CHROME_BOTTOM_PAD } from "@/lib/layout/container-classes";
import { BtnBlock } from "@/components/brutalist";
import type { CampaignPlanListItem } from "@/lib/campaign-plan-list-item";
import { useAppToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

function fmt(iso: string, isKo: boolean) {
  return new Date(iso).toLocaleString(isKo ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function won(n: number, isKo: boolean) {
  return `${n.toLocaleString(isKo ? "ko-KR" : "en-US")}${isKo ? "원" : " KRW"}`;
}

export function MyCampaignPlansPageClient() {
  const tPlan = useTranslations("planNav");
  const locale = useLocale();
  const isKo = locale === "ko";
  const toast = useAppToast();
  const [items, setItems] = useState<CampaignPlanListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/my/plan/campaigns?locale=${encodeURIComponent(locale)}`,
        { cache: "no-store", credentials: "include" },
      );
      const data = await res.json();
      if (res.status === 401) {
        setItems([]);
        toast.error(isKo ? "로그인이 필요합니다." : "Sign in required.");
        return;
      }
      if (!res.ok || !data.ok) throw new Error();
      setItems((data.data.items ?? []) as CampaignPlanListItem[]);
    } catch {
      toast.error(
        isKo ? "저장 플랜 목록을 불러오지 못했습니다." : "Could not load saved plans.",
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isKo, locale, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className={cn(MOBILE_CHROME_BOTTOM_PAD)}>
      <PageContainer>
        <Link
          href="/my/plan"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-white/55 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {tPlan("cart")}
        </Link>
        <p className="mt-3 font-display text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--qp-fg-muted)]">
          [ CAMPAIGN PLANS ]
        </p>
        <h1 className="mt-2 text-2xl font-black text-gray-900 dark:text-white md:text-3xl">
          {tPlan("campaigns")}
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-white/55">
          {isKo
            ? "브리프 위저드에서 「플랜 저장」한 캠페인 설계입니다. 항목을 열면 저장 당시 숫자·믹스를 다시 볼 수 있습니다."
            : "Campaign designs saved from the brief wizard. Open any item to revisit the saved mix and metrics."}
        </p>
        <p className="mt-2 text-xs text-gray-500 dark:text-white/45">
          {isKo ? (
            <>
              담은 매체 목록 백업은{" "}
              <Link href="/my/plan/saved" className="font-semibold text-[color:var(--qp-accent)]">
                {tPlan("saved")}
              </Link>
              에서 확인하세요.
            </>
          ) : (
            <>
              Cart snapshots live under{" "}
              <Link href="/my/plan/saved" className="font-semibold text-[color:var(--qp-accent)]">
                {tPlan("saved")}
              </Link>
              .
            </>
          )}
        </p>

        {loading ? (
          <div className="mt-12 flex justify-center text-gray-500 dark:text-white/55">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-[28px] border border-gray-200 bg-gray-50 p-10 text-center dark:border-white/12 dark:bg-white/5">
            <p className="text-sm font-semibold text-gray-700 dark:text-white/80">
              {isKo ? "저장된 캠페인 플랜이 없습니다" : "No saved campaign plans yet"}
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-white/50">
              {isKo
                ? "플래너 브리프 3단계에서 로그인 후 「플랜 저장」을 누르면 여기에 표시됩니다."
                : "Sign in and use Save plan on brief step 3 to list plans here."}
            </p>
            <BtnBlock href="/planner" variant="accent" className="mt-6">
              {isKo ? "플래너로 이동" : "Go to planner"}
            </BtnBlock>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-gray-200 bg-white/80 p-4 dark:border-white/12 dark:bg-white/5 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                      {fmt(item.createdAt, isKo)}
                      {item.regionsText ? ` · ${item.regionsText}` : ""}
                      {item.goalTitle ? ` · ${item.goalTitle}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-white/70 tabular-nums">
                      {isKo
                        ? `매체 ${item.mediaCount}개 · 총 ${won(item.totalCostWon, isKo)}`
                        : `${item.mediaCount} media · ${won(item.totalCostWon, isKo)} total`}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-white/45">
                      {item.flightStart} — {item.flightEnd}
                      {item.expiresAt
                        ? isKo
                          ? ` · ${fmt(item.expiresAt, isKo)}까지`
                          : ` · until ${fmt(item.expiresAt, isKo)}`
                        : null}
                    </p>
                  </div>
                  <BtnBlock
                    href={`/planner?plan=${encodeURIComponent(item.id)}`}
                    variant="accent"
                    size="sm"
                    className="inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {isKo ? "플랜 열기" : "Open plan"}
                  </BtnBlock>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PageContainer>
    </div>
  );
}
