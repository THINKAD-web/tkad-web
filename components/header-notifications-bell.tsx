"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Bell } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useAuthSession } from "@/components/auth/auth-session-provider";
import { cn } from "@/lib/utils";
import { headerChromeIconButtonClass, headerChromeIconGhostClass, headerMobileMenuRowClass } from "@/components/public-chrome/header-chrome-buttons";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

const DROPDOWN_LIMIT = 5;

const menuRowClass = headerMobileMenuRowClass;

export function HeaderNotificationsBell({
  onNavigate,
  variant = "icon",
  className,
  compact = false,
}: {
  onNavigate?: () => void;
  variant?: "icon" | "menu";
  className?: string;
  compact?: boolean;
}) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const { user } = useAuthSession();
  const loggedIn = Boolean(user?.id);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    if (!loggedIn) {
      setUnreadCount(0);
      setItems([]);
      return;
    }
    try {
      const r = await fetch("/api/my/notifications?limit=5", {
        cache: "no-store",
      });
      const rd = await r.json();
      if (rd?.ok) {
        setItems(rd.data.items ?? []);
        setUnreadCount(rd.data.unreadCount ?? 0);
      }
    } catch {
      setUnreadCount(0);
      setItems([]);
    }
  }, [loggedIn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!open || !loggedIn) return;
    let cancelled = false;
    setLoading(true);
    void fetch("/api/my/notifications?limit=5", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.ok) {
          setItems(d.data.items ?? []);
          setUnreadCount(d.data.unreadCount ?? 0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, loggedIn]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function markRead(id: string) {
    await fetch(`/api/my/notifications/${id}/read`, { method: "PATCH" });
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function onItemClick(item: NotificationItem) {
    if (!item.isRead) await markRead(item.id);
    setOpen(false);
    onNavigate?.();
  }

  if (!loggedIn) return null;

  const aria =
    unreadCount > 0
      ? isKo
        ? `알림 ${unreadCount}건`
        : `Notifications (${unreadCount})`
      : isKo
        ? "알림"
        : "Notifications";

  if (variant === "menu") {
    return (
      <Link
        href="/my/notifications"
        onClick={onNavigate}
        className={className ?? menuRowClass}
        aria-label={aria}
      >
        <Bell className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        <span className="flex-1">{isKo ? "알림" : "Notifications"}</span>
        {unreadCount > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold dark:text-white text-gray-900">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative",
          compact ? headerChromeIconGhostClass : headerChromeIconButtonClass,
          className,
        )}
        aria-label={aria}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-4 w-4" strokeWidth={2} aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold dark:text-white text-gray-900 ring-1 ring-white/30">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={cn(
            "absolute right-0 top-[calc(100%+8px)] z-[200] w-[min(92vw,320px)] overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl",
            "dark:border-white/12 border-gray-200 dark:bg-[#0a0a12]/95 dark:backdrop-blur-xl",
          )}
          role="menu"
        >
          <div className="border-b border-border/70 px-4 py-3 dark:border-white/10 border-gray-200">
            <p className="text-sm font-bold text-foreground dark:text-white text-gray-900">
              {isKo ? "알림" : "Notifications"}
            </p>
          </div>
          <div className="max-h-[min(60vh,360px)] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                {isKo ? "불러오는 중…" : "Loading…"}
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                {isKo ? "새 알림이 없습니다." : "No notifications."}
              </p>
            ) : (
              <ul>
                {items.slice(0, DROPDOWN_LIMIT).map((n) => {
                  const inner = (
                    <>
                      <p
                        className={cn(
                          "text-sm font-semibold leading-snug",
                          !n.isRead
                            ? "text-foreground dark:text-white text-gray-900"
                            : "text-muted-foreground",
                        )}
                      >
                        {n.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.body}
                      </p>
                    </>
                  );
                  return (
                    <li key={n.id} className="border-b border-border/50 last:border-0 dark:border-white/8">
                      {n.link ? (
                        <Link
                          href={n.link}
                          onClick={() => void onItemClick(n)}
                          className="block px-4 py-3 transition-colors hover:bg-muted/60 dark:hover:dark:bg-white/6 bg-gray-50"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void onItemClick(n)}
                          className="block w-full px-4 py-3 text-left transition-colors hover:bg-muted/60 dark:hover:dark:bg-white/6 bg-gray-50"
                        >
                          {inner}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="border-t border-border/70 p-2 dark:border-white/10 border-gray-200">
            <Link
              href="/my/notifications"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className="block rounded-xl px-3 py-2 text-center text-xs font-semibold text-violet-600 hover:bg-muted/50 dark:text-cyan-300 dark:hover:dark:bg-white/6 bg-gray-50"
            >
              {isKo ? "전체 보기" : "View all"}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
