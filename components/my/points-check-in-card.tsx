"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAppToast } from "@/lib/use-toast";
import { enqueuePointToast } from "@/lib/points-toast";
import { myHubGlassCard } from "@/lib/my-hub-ui";
import { cn } from "@/lib/utils";
import { CalendarCheck } from "lucide-react";

type Props = {
  className?: string;
};

export function PointsCheckInCard({ className }: Props) {
  const t = useTranslations("points");
  const toast = useAppToast();
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/points/balance", { cache: "no-store" });
    const data = await res.json();
    if (data.ok) {
      setCheckedIn(Boolean(data.data.checkedInToday));
      setStreakDays(data.data.streakDays ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCheckIn() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/points/check-in", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (data?.error?.code === "ALREADY_CHECKED") {
          setCheckedIn(true);
          toast.warning(t("checkInDone"));
        } else {
          toast.error(data?.error?.message ?? t("checkInFailed"));
        }
        return;
      }
      setCheckedIn(true);
      setStreakDays(data.data.streakDays ?? 0);
      if (data.data.points) {
        enqueuePointToast(data.data.points);
      } else {
        toast.success(t("checkInSuccess", { pts: data.data.earned }));
      }
    } catch {
      toast.error(t("checkInFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={cn(myHubGlassCard, "mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        <p className="flex items-center gap-2 font-display text-xs font-medium uppercase tracking-[0.18em] text-primary">
          <CalendarCheck className="h-4 w-4" />
          {t("checkInTitle")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {checkedIn ? t("checkInDone") : t("checkInDesc")}
        </p>
        {streakDays > 0 ? (
          <p className="mt-1 text-[11px] text-primary">
            {t("checkInStreak", { days: streakDays })}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        disabled={loading || checkedIn || submitting}
        onClick={() => void handleCheckIn()}
        className={cn(
          "shrink-0 rounded-2xl px-5 py-3 font-display text-xs font-medium uppercase tracking-wider transition-ui",
          checkedIn
            ? "bg-muted text-muted-foreground"
            : "bg-primary text-primary-foreground hover:opacity-90",
        )}
      >
        {checkedIn ? t("checkInDoneBtn") : submitting ? "…" : t("checkInBtn")}
      </button>
    </div>
  );
}
