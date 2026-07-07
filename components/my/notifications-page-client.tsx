"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { FullPageSpinner, EmptyState } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

type Filter = "all" | "unread";

const glassCard =
  "rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur sm:p-5";

const gradientBtn =
  "inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-2.5 text-sm font-semibold dark:text-white text-gray-900 shadow-[0_8px_28px_rgba(124,58,237,0.35)] transition-opacity hover:opacity-95 disabled:opacity-50";

const outlineBtn =
  "inline-flex items-center justify-center rounded-xl border dark:border-white/18 border-gray-300 dark:bg-white/5 bg-gray-50 px-4 py-2.5 text-sm font-semibold dark:text-white text-gray-900 transition-colors hover:dark:bg-white/10 bg-gray-100 disabled:opacity-50";

export function NotificationsPageClient() {
  const router = useRouter();
  const locale = useLocale();
  const isKo = locale === "ko";
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const session = await res.json();
      if (!session?.ok || !session.data) {
        router.replace("/login?redirect=/my/notifications");
        return;
      }
      const q =
        filter === "unread"
          ? "/api/my/notifications?unread=true&limit=100"
          : "/api/my/notifications?limit=100";
      const nRes = await fetch(q, { cache: "no-store" });
      const data = await nRes.json();
      if (data?.ok) setItems(data.data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: string) {
    await fetch(`/api/my/notifications/${id}/read`, { method: "PATCH" });
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await fetch("/api/my/notifications/read-all", { method: "PATCH" });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } finally {
      setMarkingAll(false);
    }
  }

  async function onItemActivate(item: NotificationItem) {
    if (!item.isRead) await markRead(item.id);
    if (item.link) router.push(item.link);
  }

  const filtered =
    filter === "unread" ? items.filter((n) => !n.isRead) : items;

  if (loading) {
    return (
      <FullPageSpinner label={isKo ? "알림 불러오는 중…" : "Loading notifications…"} />
    );
  }

  return (
      <PageContainer variant="prose" className="py-4 sm:py-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-xs font-medium uppercase tracking-[0.24em] text-cyan-300/80">
              {isKo ? "// MY · ALERTS" : "// MY · ALERTS"}
            </p>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-black tracking-tight dark:text-white text-gray-900 sm:text-3xl">
              <Bell className="h-7 w-7 text-cyan-300" aria-hidden />
              {isKo ? "알림" : "Notifications"}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={markingAll || !items.some((n) => !n.isRead)}
            className={outlineBtn}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            {isKo ? "전체 읽음" : "Mark all read"}
          </button>
        </div>

        <div className="mb-6 flex gap-2">
          {(["all", "unread"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-full px-4 py-2 font-display text-xs font-medium uppercase tracking-[0.18em] transition-colors",
                filter === key
                  ? "bg-gradient-to-r from-violet-500 to-cyan-400 dark:text-white text-gray-900"
                  : "border dark:border-white/18 border-gray-300 dark:bg-white/5 bg-gray-50 dark:text-white text-gray-600 hover:dark:bg-white/10 bg-gray-100",
              )}
            >
              {key === "all"
                ? isKo
                  ? "전체"
                  : "All"
                : isKo
                  ? "안 읽음"
                  : "Unread"}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="🔔"
            title={isKo ? "알림이 없습니다" : "No notifications"}
            description={
              isKo
                ? "캠페인·견적·찜한 매체 소식이 여기에 표시됩니다."
                : "Campaign, quote, and favorite media updates appear here."
            }
            action={
              <button
                type="button"
                onClick={() => router.push("/media")}
                className={gradientBtn}
              >
                {isKo ? "매체 탐색하기" : "Browse media"}
              </button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {filtered.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void onItemActivate(n)}
                  className={cn(
                    glassCard,
                    "w-full text-left transition-colors hover:border-cyan-400/30 hover:dark:bg-white/8 bg-gray-100",
                    !n.isRead && "border-cyan-400/25 ring-1 ring-cyan-400/20",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-base font-bold",
                          n.isRead ? "dark:text-white text-gray-700" : "dark:text-white text-gray-900",
                        )}
                      >
                        {n.title}
                      </p>
                      <p className="mt-1 text-sm dark:text-white text-gray-600">{n.body}</p>
                      <p className="mt-2 font-display text-xs font-medium uppercase tracking-[0.14em] dark:text-white text-gray-400">
                        {new Date(n.createdAt).toLocaleString(
                          isKo ? "ko-KR" : "en-US",
                        )}
                      </p>
                    </div>
                    {!n.isRead ? (
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500"
                        aria-hidden
                      />
                    ) : null}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PageContainer>
  );
}
