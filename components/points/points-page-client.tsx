"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { PageContainer } from "@/components/layout/page-container";
import { NeonFullPageSpinner } from "@/components/ui/neon-page-spinner";
import { useAppToast } from "@/lib/use-toast";
import { POINT_COSTS, POINT_REWARDS } from "@/lib/points-constants";
import { cn } from "@/lib/utils";
import { Sparkles, Gift, Crown, FileText, Zap, Rocket } from "lucide-react";

type Summary = {
  balance: number;
  monthEarned: number;
  monthSpent: number;
  expiringSoon: number;
};

type TxItem = {
  id: string;
  type: string;
  amount: number;
  description: string;
  balanceAfter: number | null;
  createdAt: string;
};

type RedeemKey = keyof typeof POINT_COSTS;

const REDEEM_CARDS: {
  type: RedeemKey;
  icon: typeof Zap;
  badge?: string;
}[] = [
  { type: "PRO_DAY", icon: Zap },
  { type: "PRO_WEEK", icon: Rocket, badge: "14% 절약" },
  { type: "PRO_MONTH", icon: Crown, badge: "33% 절약" },
  { type: "PDF_REPORT", icon: FileText },
];

const EARN_ROWS = Object.entries(POINT_REWARDS).map(([key, value]) => ({
  key,
  value,
}));

export function PointsPageClient() {
  const t = useTranslations("points");
  const router = useRouter();
  const toast = useAppToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tx, setTx] = useState<TxItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [redeeming, setRedeeming] = useState<RedeemKey | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadSummary = useCallback(async () => {
    const res = await fetch("/api/points/balance", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      if (res.status === 401) router.push("/login");
      return null;
    }
    return data.data as Summary;
  }, [router]);

  const loadTx = useCallback(async (nextCursor?: string) => {
    const qs = new URLSearchParams({ limit: "20" });
    if (nextCursor) qs.set("cursor", nextCursor);
    const res = await fetch(`/api/points/transactions?${qs}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || !data.ok) return { items: [] as TxItem[], nextCursor: null };
    return data.data as { items: TxItem[]; nextCursor: string | null };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await loadSummary();
      const first = await loadTx();
      if (cancelled) return;
      setSummary(s);
      setTx(first.items);
      setCursor(first.nextCursor);
      setHasMore(Boolean(first.nextCursor));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSummary, loadTx]);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const el = sentinelRef.current;
    const obs = new IntersectionObserver(async (entries) => {
      if (!entries[0]?.isIntersecting || !cursor) return;
      const next = await loadTx(cursor);
      setTx((prev) => [...prev, ...next.items]);
      setCursor(next.nextCursor);
      setHasMore(Boolean(next.nextCursor));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [cursor, hasMore, loadTx]);

  async function handleRedeem(type: RedeemKey) {
    setRedeeming(type);
    try {
      const res = await fetch("/api/points/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data?.error?.message ?? t("redeemFailed"));
        return;
      }
      toast.success(t("redeemSuccess", { type: t(`redeem.${type}`) }));
      const s = await loadSummary();
      setSummary(s);
      const first = await loadTx();
      setTx(first.items);
      setCursor(first.nextCursor);
    } catch {
      toast.error(t("redeemFailed"));
    } finally {
      setRedeeming(null);
    }
  }

  if (loading) {
    return (
      <HomeLandingDayNight>
        <NeonFullPageSpinner label={t("loading")} />
      </HomeLandingDayNight>
    );
  }

  const balance = summary?.balance ?? 0;

  return (
    <HomeLandingDayNight>
      <PageContainer variant="prose" className="tkad-landing-neon tkad-planner-neon py-10">
        <div className="tkad-glass-surface tkad-neon-border mb-8 rounded-[28px] border p-6 sm:p-8">
          <p className="tkad-type-label text-primary">
            {t("eyebrow")}
          </p>
          <p className="mt-3 text-4xl font-black tabular-nums tracking-tight">
            ✦ {balance.toLocaleString()} P
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-muted/30 p-3">
              <p className="font-display text-xs font-medium uppercase text-muted-foreground">{t("monthEarned")}</p>
              <p className="mt-1 text-lg font-bold text-emerald-400 tabular-nums">
                +{(summary?.monthEarned ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl bg-muted/30 p-3">
              <p className="font-display text-xs font-medium uppercase text-muted-foreground">{t("monthSpent")}</p>
              <p className="mt-1 text-lg font-bold text-rose-400 tabular-nums">
                -{(summary?.monthSpent ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl bg-muted/30 p-3">
              <p className="font-display text-xs font-medium uppercase text-muted-foreground">{t("expiringSoon")}</p>
              <p className="mt-1 text-lg font-bold text-amber-400 tabular-nums">
                {(summary?.expiringSoon ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <h2 className="mb-4 flex items-center gap-2 tkad-type-label text-muted-foreground">
          <Gift className="h-4 w-4" />
          {t("shopTitle")}
        </h2>
        <div className="mb-10 grid gap-4 sm:grid-cols-2">
          {REDEEM_CARDS.map(({ type, icon: Icon, badge }) => {
            const cost = POINT_COSTS[type];
            const canAfford = balance >= cost;
            return (
              <div
                key={type}
                className="tkad-glass-surface tkad-neon-border flex flex-col rounded-[24px] border p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <p className="font-bold">{t(`redeem.${type}`)}</p>
                  </div>
                  {badge ? (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 tkad-type-note font-bold text-primary">
                      {badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-2xl font-black tabular-nums">{cost.toLocaleString()}P</p>
                <button
                  type="button"
                  disabled={!canAfford || redeeming === type}
                  onClick={() => void handleRedeem(type)}
                  className={cn(
                    "mt-4 rounded-2xl px-4 py-3 tkad-type-label transition-ui",
                    canAfford
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "cursor-not-allowed bg-muted text-muted-foreground",
                  )}
                >
                  {redeeming === type ? t("redeeming") : t("redeemBtn")}
                </button>
              </div>
            );
          })}
        </div>

        <h2 className="mb-4 flex items-center gap-2 tkad-type-label text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          {t("earnGuideTitle")}
        </h2>
        <div className="tkad-glass-surface tkad-neon-border mb-10 overflow-hidden rounded-[24px] border">
          <table className="w-full text-sm">
            <tbody>
              {EARN_ROWS.map(({ key, value }) => (
                <tr key={key} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-3">{t(`earn.${key}`)}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-primary">
                    +{value.toLocaleString()}P
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mb-4 tkad-type-label text-muted-foreground">
          {t("historyTitle")}
        </h2>
        <div className="tkad-glass-surface tkad-neon-border rounded-[24px] border divide-y divide-border/40">
          {tx.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">{t("historyEmpty")}</p>
          ) : (
            tx.map((row) => (
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
          <div ref={sentinelRef} className="h-4" />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/my/referral" className="text-primary underline-offset-2 hover:underline">
            {t("referralLink")}
          </Link>
        </p>
      </PageContainer>
    </HomeLandingDayNight>
  );
}
