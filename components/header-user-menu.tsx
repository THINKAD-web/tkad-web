"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ShoppingCart, User as UserIcon } from "lucide-react";
import { useCart } from "@/lib/cart";
import { HeaderFavoritesLink } from "@/components/header-favorites-link";
import { FavoritesSessionSync } from "@/components/favorites-session-sync";

type Session = { id: string; email: string; name: string; role: string } | null;

function useSession() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setSession(d?.ok ? d.data : null);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]); // 경로 변경(로그아웃 후 /login 이동 등) 시 재조회
  return { session, loaded };
}

const menuRowClass =
  "flex min-h-[3.25rem] items-center gap-3 px-5 py-3 text-sm font-semibold tracking-tight text-zinc-900 transition-colors hover:bg-zinc-200/80 dark:text-white dark:hover:bg-white/6";

export function HeaderUserMenu({
  onNavigate,
  variant = "inline",
}: {
  onNavigate?: () => void;
  variant?: "inline" | "menu";
}) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const { session, loaded } = useSession();
  const { ids } = useCart();

  if (!loaded) return null;

  if (variant === "menu") {
    return (
      <div className="divide-y divide-zinc-200 dark:divide-white/10">
        <FavoritesSessionSync />
        <HeaderFavoritesLink
          onNavigate={onNavigate}
          variant="menu"
          className={menuRowClass}
        />
        <Link
          href="/cart"
          onClick={onNavigate}
          className={menuRowClass}
          aria-label={`장바구니${ids.length > 0 ? ` (${ids.length})` : ""}`}
        >
          <ShoppingCart className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span className="flex-1">{isKo ? "장바구니" : "Cart"}</span>
          {ids.length > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 px-1.5 text-[10px] font-bold text-white dark:from-violet-500 dark:to-cyan-400">
              {ids.length}
            </span>
          ) : null}
        </Link>
        {session ? (
          <Link href="/dashboard" onClick={onNavigate} className={menuRowClass}>
            <UserIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{session.name}</span>
          </Link>
        ) : (
          <Link href="/login" onClick={onNavigate} className={menuRowClass}>
            <UserIcon className="h-4 w-4 shrink-0" />
            <span>{isKo ? "로그인" : "Log in"}</span>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <FavoritesSessionSync />
      <HeaderFavoritesLink onNavigate={onNavigate} />
      <Link
        href="/cart"
        onClick={onNavigate}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-violet-600 hover:bg-secondary/60 active:scale-95 transition-all duration-150 dark:hover:text-cyan-300"
        aria-label={`장바구니${ids.length > 0 ? ` (${ids.length})` : ""}`}
      >
        <ShoppingCart className="h-4 w-4" strokeWidth={2} />
        {ids.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 px-1 text-[10px] font-bold text-white shadow-[0_2px_10px_rgba(124,58,237,0.38)] ring-1 ring-white/30 dark:from-violet-500 dark:to-cyan-400 dark:shadow-[0_0_14px_rgba(34,211,238,0.28)] dark:ring-white/20">
            {ids.length}
          </span>
        )}
      </Link>
      {session ? (
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-foreground hover:bg-secondary/60 transition-colors"
        >
          <UserIcon className="h-4 w-4" />
          <span className="max-w-[6rem] truncate">{session.name}</span>
        </Link>
      ) : (
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-9 rounded-full px-3 text-foreground hover:text-foreground dark:text-white dark:hover:text-white"
        >
          <Link href="/login" onClick={onNavigate}>
            로그인
          </Link>
        </Button>
      )}
    </div>
  );
}
