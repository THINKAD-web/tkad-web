"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  MessageSquare,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { PageContainer } from "@/components/layout/page-container";
import { MOBILE_CHROME_BOTTOM_PAD } from "@/lib/layout/container-classes";
import { BtnBlock } from "@/components/brutalist";
import { replacePlanCart } from "@/lib/plan-cart";
import { pushPlanCartToServer } from "@/lib/plan-cart-server-sync";
import type { SavedPlanCartListItem } from "@/lib/saved-plan-cart/types";
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

const INTENT_LABELS = {
  case: { ko: "사례 후보", en: "Case candidate" },
  community: { ko: "커뮤니티 후보", en: "Community candidate" },
} as const;

export function MySavedPlansPageClient() {
  const tPlan = useTranslations("planNav");
  const locale = useLocale();
  const isKo = locale === "ko";
  const router = useRouter();
  const toast = useAppToast();
  const [items, setItems] = useState<SavedPlanCartListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/my/plan/saved", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      if (res.status === 401) {
        setItems([]);
        toast.error(isKo ? "로그인이 필요합니다." : "Sign in required.");
        return;
      }
      if (!res.ok || !data.ok) throw new Error();
      setItems((data.data.items ?? []) as SavedPlanCartListItem[]);
    } catch {
      toast.error(isKo ? "목록을 불러오지 못했습니다." : "Could not load saved plans.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isKo, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm(isKo ? "이 플랜을 삭제할까요?" : "Delete this saved plan?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/my/plan/saved/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error();
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.success(isKo ? "삭제했습니다." : "Deleted.");
    } catch {
      toast.error(isKo ? "삭제에 실패했습니다." : "Delete failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/my/plan/saved/${id}/restore`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error();
      replacePlanCart(data.data.cart);
      void pushPlanCartToServer(data.data.cart);
      toast.success(isKo ? "내 플랜에 불러왔습니다." : "Restored to My plan.");
      router.push("/my/plan");
    } catch {
      toast.error(isKo ? "불러오기에 실패했습니다." : "Restore failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleIntent(
    id: string,
    intent: "case" | "community" | null,
  ) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/my/plan/saved/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publishIntent: intent }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error();
      setItems((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, publishIntent: data.data.publishIntent } : x,
        ),
      );
      toast.success(isKo ? "표시를 업데이트했습니다." : "Updated.");
    } catch {
      toast.error(isKo ? "업데이트에 실패했습니다." : "Update failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <HomeLandingDayNight>
      <div
        className={cn(
          "tkad-landing-neon tkad-planner-neon min-h-[calc(100vh-72px)] py-8",
          MOBILE_CHROME_BOTTOM_PAD,
        )}
      >
        <PageContainer>
          <Link
            href="/my/plan"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-white/55 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {tPlan("cart")}
          </Link>
          <p className="mt-3 font-display text-xs font-medium uppercase tracking-[0.22em] text-cyan-600/70 dark:text-cyan-300/70">
            [ SAVED PLANS ]
          </p>
          <h1 className="mt-2 text-2xl font-black text-gray-900 dark:text-white md:text-3xl">
            {tPlan("saved")}
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-white/55">
            {isKo
              ? "저장한 플랜을 불러오거나 삭제할 수 있습니다. 사례·커뮤니티 활용 후보로 표시하면 운영팀이 검토합니다."
              : "Restore or delete saved plans. Mark as case/community candidate for admin review."}
          </p>

          {loading ? (
            <div className="mt-12 flex justify-center text-gray-500 dark:text-white/55">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="mt-10 rounded-[28px] border border-gray-200 bg-gray-50 p-10 text-center dark:border-white/12 dark:bg-white/5">
              <p className="text-sm font-semibold text-gray-700 dark:text-white/80">
                {isKo ? "저장된 플랜이 없습니다" : "No saved plans yet"}
              </p>
              <BtnBlock href="/my/plan" variant="accent" className="mt-6">
                {isKo ? `${tPlan("cart")}로` : `Go to ${tPlan("cart")}`}
              </BtnBlock>
            </div>
          ) : (
            <ul className="mt-8 space-y-4">
              {items.map((item) => {
                const busy = busyId === item.id;
                return (
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
                        <p className="mt-1 text-sm text-gray-600 dark:text-white/70">
                          {isKo
                            ? `매체 ${item.mediaCount}개`
                            : `${item.mediaCount} media`}
                          {item.description ? ` — ${item.description}` : ""}
                        </p>
                        {item.publishIntent ? (
                          <span className="mt-2 inline-flex rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-200">
                            {isKo
                              ? INTENT_LABELS[item.publishIntent].ko
                              : INTENT_LABELS[item.publishIntent].en}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleRestore(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-800 dark:border-white/12 dark:text-white"
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          {isKo ? "불러오기" : "Restore"}
                        </button>
                        <BtnBlock
                          href="/my/plan/report"
                          variant="secondary"
                          size="sm"
                        >
                          {isKo ? "보고서" : "Report"}
                        </BtnBlock>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleDelete(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:text-rose-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {isKo ? "삭제" : "Delete"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-white/10">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/40">
                        {isKo ? "활용 표시" : "Publish intent"}
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void toggleIntent(
                            item.id,
                            item.publishIntent === "case" ? null : "case",
                          )
                        }
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                          item.publishIntent === "case"
                            ? "bg-violet-600 text-white"
                            : "border border-gray-200 text-gray-700 dark:border-white/12 dark:text-white/80",
                        )}
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        {isKo ? "사례 후보" : "Case"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void toggleIntent(
                            item.id,
                            item.publishIntent === "community" ? null : "community",
                          )
                        }
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                          item.publishIntent === "community"
                            ? "bg-cyan-600 text-white"
                            : "border border-gray-200 text-gray-700 dark:border-white/12 dark:text-white/80",
                        )}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {isKo ? "커뮤니티 후보" : "Community"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </PageContainer>
      </div>
    </HomeLandingDayNight>
  );
}
