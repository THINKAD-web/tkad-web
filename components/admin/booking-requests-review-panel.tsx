"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, Check, X, RefreshCw, Mail, Phone } from "lucide-react";

type RequestItem = {
  id: string;
  mediaId: string;
  mediaName: string;
  mediaLocation: string;
  status: string;
  startsAt: string;
  endsAt: string;
  requesterName: string | null;
  requesterEmail: string | null;
  requesterPhone: string | null;
  budgetWon: number | null;
  notes: string | null;
  createdAt: string;
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtBudget(won: number | null): string {
  if (won == null || won <= 0) return "—";
  return `₩${won.toLocaleString("ko-KR")}`;
}

/**
 * 어드민 미디어 허브 상단의 "검토 대기" 패널.
 *
 * - status="requested" 인 광고주 자가 신청만 모아서 노출
 * - 한 번에 결정: 가홀드 / 확정 / 거절 (취소)
 *   · 가홀드 / 확정은 충돌 체크 → 충돌 발견 시 confirm 후 force=true 재시도
 *   · 거절은 충돌 무관
 * - 상태 변경은 PATCH /api/admin/media-bookings/[id] 로 위임 (메일 자동 발송)
 */
export function AdminBookingRequestsReviewPanel() {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/booking-requests?status=requested", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as { items?: RequestItem[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "불러오기 실패");
        return;
      }
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const decide = async (
    id: string,
    nextStatus: "tentative" | "confirmed" | "cancelled",
    force = false,
  ) => {
    setDecidingId(id);
    try {
      const res = await fetch(`/api/admin/media-bookings/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, force }),
      });
      if (res.status === 409 && !force) {
        const j = (await res.json()) as {
          conflicts?: { summary: string }[];
          error?: string;
        };
        const summary = (j.conflicts ?? []).map((c) => `· ${c.summary}`).join("\n");
        const ok = window.confirm(
          `이 매체의 활성 예약과 시간이 겹칩니다.\n\n${summary}\n\n그래도 ${nextStatus} 로 결정할까요?`,
        );
        if (ok) {
          await decide(id, nextStatus, true);
        }
        return;
      }
      if (!res.ok) {
        const j = await res.json();
        window.alert(j.error ?? "결정 처리 실패");
        return;
      }
      await reload();
    } finally {
      setDecidingId(null);
    }
  };

  return (
    <Card className="border-2 border-accent bg-card dark:border-accent dark:bg-hero-void">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-accent" />
          검토 대기 — 광고주 신청 ({items.length}건)
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void reload()}
          disabled={loading}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            불러오는 중…
          </div>
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : items.length === 0 ? (
          <p className="py-4 text-center font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {`// 현재 대기 중인 신청이 없습니다`}
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => {
              const busy = decidingId === it.id;
              return (
                <li
                  key={it.id}
                  className="flex flex-col gap-3 border-2 border-border/15 p-3 sm:flex-row sm:items-start sm:gap-4"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="font-bold text-foreground dark:text-hero-fg">
                        {it.mediaName}
                      </p>
                      <span className="font-display text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {it.mediaLocation}
                      </span>
                    </div>
                    <p className="text-xs text-foreground dark:text-hero-fg">
                      <span className="font-display uppercase tracking-[0.14em] text-muted-foreground">
                        기간:
                      </span>{" "}
                      {fmt(it.startsAt)} → {fmt(it.endsAt)}{" "}
                      <span className="font-display uppercase tracking-[0.14em] text-muted-foreground">
                        / 예산:
                      </span>{" "}
                      {fmtBudget(it.budgetWon)}
                    </p>
                    <p className="text-xs text-foreground dark:text-hero-fg">
                      <span className="font-display uppercase tracking-[0.14em] text-muted-foreground">
                        신청자:
                      </span>{" "}
                      {it.requesterName}
                      {it.requesterEmail ? (
                        <a
                          href={`mailto:${it.requesterEmail}`}
                          className="ml-2 inline-flex items-center gap-1 text-accent hover:underline"
                        >
                          <Mail className="h-3 w-3" />
                          {it.requesterEmail}
                        </a>
                      ) : null}
                      {it.requesterPhone ? (
                        <a
                          href={`tel:${it.requesterPhone}`}
                          className="ml-2 inline-flex items-center gap-1 text-accent hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {it.requesterPhone}
                        </a>
                      ) : null}
                    </p>
                    {it.notes ? (
                      <p className="border-l-4 border-accent bg-muted px-3 py-1.5 text-xs whitespace-pre-wrap text-foreground dark:bg-muted/50 dark:text-hero-fg">
                        {it.notes}
                      </p>
                    ) : null}
                    <p className="font-display text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      신청: {fmt(it.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 sm:flex-col sm:gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      className="border-2 border-emerald-600 bg-emerald-600 dark:text-white text-gray-900 hover:bg-emerald-700"
                      onClick={() => void decide(it.id, "confirmed")}
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      확정
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void decide(it.id, "tentative")}
                    >
                      가홀드
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      className="text-rose-600 hover:bg-rose-50"
                      onClick={() => {
                        if (
                          window.confirm(
                            "이 신청을 거절하시겠습니까? 광고주에게 결과 메일이 자동 발송됩니다.",
                          )
                        ) {
                          void decide(it.id, "cancelled");
                        }
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                      거절
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
