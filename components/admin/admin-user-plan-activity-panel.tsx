"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import type { AdminSavedPlanRow } from "@/lib/saved-plan-cart/admin-queries";
import type { AdminPlanReportActivityRow } from "@/lib/plan-report-activity/types";
import {
  eventTypeLabelKo,
  sourceLabelKo,
} from "@/lib/plan-report-activity/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  userId: string;
  locale: string;
  /** CRM 프로필 등 — 상단 전체 보기 링크 */
  showFullLink?: boolean;
};

export function AdminUserPlanActivityPanel({
  userId,
  locale,
  showFullLink = true,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [savedPlans, setSavedPlans] = useState<AdminSavedPlanRow[]>([]);
  const [savedTotal, setSavedTotal] = useState(0);
  const [activities, setActivities] = useState<AdminPlanReportActivityRow[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [savedRes, activityRes] = await Promise.all([
        fetch(
          `/api/admin/plan-snapshots?userId=${encodeURIComponent(userId)}&page=1&pageSize=5&status=saved`,
        ),
        fetch(
          `/api/admin/plan-report-activity?userId=${encodeURIComponent(userId)}&page=1&pageSize=15`,
        ),
      ]);
      const savedData = await savedRes.json();
      const activityData = await activityRes.json();
      if (savedRes.ok) {
        setSavedPlans(savedData.items ?? []);
        setSavedTotal(savedData.total ?? 0);
      } else {
        setSavedPlans([]);
        setSavedTotal(0);
      }
      if (activityRes.ok) {
        setActivities(activityData.items ?? []);
        setActivityTotal(activityData.total ?? 0);
      } else {
        setActivities([]);
        setActivityTotal(0);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const fullHref = `/${locale}/admin/plan-snapshots?userId=${userId}`;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const empty = savedTotal === 0 && activityTotal === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">플랜 · 보고서 활동</CardTitle>
            <CardDescription>
              저장 플랜 {savedTotal}건 · 보고서 활동 {activityTotal}건
            </CardDescription>
          </div>
          {showFullLink ? (
            <Link
              href={fullHref}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--qp-accent)] underline-offset-2 hover:underline dark:text-[color:var(--qp-accent)]"
            >
              전체 보기
              <ExternalLink className="h-3 w-3" />
            </Link>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {empty ? (
          <p className="text-sm text-muted-foreground">
            이 회원의 저장 플랜·보고서 조회/PDF 기록이 아직 없습니다. 보고서를 열거나
            PDF를 받으면 활동에 기록됩니다.
          </p>
        ) : null}

        {savedPlans.length > 0 ? (
          <section>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              최근 저장 플랜
            </p>
            <ul className="space-y-2 text-sm">
              {savedPlans.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-border bg-muted/20 px-3 py-2"
                >
                  <div className="font-medium">{row.title}</div>
                  <div className="text-xs text-muted-foreground">
                    매체 {row.mediaCount}개
                    {row.goalTitle ? ` · ${row.goalTitle}` : ""}
                    {row.regionsText ? ` · ${row.regionsText}` : ""}
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {fmt(row.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {activities.length > 0 ? (
          <section>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              최근 보고서 활동
            </p>
            <ul className="divide-y divide-border text-sm">
              {activities.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-start justify-between gap-2 py-2"
                >
                  <div>
                    <div className="font-medium">
                      {eventTypeLabelKo(row.eventType)}
                      {row.format ? ` · ${row.format.toUpperCase()}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {sourceLabelKo(row.source)}
                      {row.mediaCount > 0 ? ` · 매체 ${row.mediaCount}개` : ""}
                      {row.goalTitle ? ` · ${row.goalTitle}` : ""}
                      {row.recipientEmail ? ` · ${row.recipientEmail}` : ""}
                    </div>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {fmt(row.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
