"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter as useNextRouter } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  ShoppingCart,
  User as UserIcon,
  UserCog,
} from "lucide-react";
import { useCart } from "@/lib/cart";
import { GuestFavoritesSync } from "@/components/guest-favorites-sync";

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

export function HeaderUserMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { session, loaded } = useSession();
  const { ids } = useCart();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const intlRouter = useRouter();
  const nextRouter = useNextRouter();

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const navigate = useCallback(() => {
    setOpen(false);
    onNavigate?.();
  }, [onNavigate]);

  const handleLogout = useCallback(async () => {
    setOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    intlRouter.push("/");
    intlRouter.refresh();
    nextRouter.refresh();
  }, [intlRouter, nextRouter]);

  if (!loaded) return null;

  return (
    <div className="flex items-center gap-1.5">
      {/* Guest 찜 큐 → DB 동기화는 헤더에 한 번만 마운트되도록 여기서 처리 */}
      <GuestFavoritesSync />

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
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-foreground hover:bg-secondary/60 transition-colors"
          >
            <UserIcon className="h-4 w-4" />
            <span className="max-w-[6rem] truncate">{session.name}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          {open ? (
            <div
              role="menu"
              className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-popover/95 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur supports-[backdrop-filter]:bg-popover/90"
            >
              <div className="border-b border-border px-3 py-2.5">
                <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                  {labelForRole(session.role)}
                </p>
                <p className="truncate text-sm font-bold text-foreground">{session.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{session.email}</p>
              </div>
              <MenuItem
                href="/dashboard"
                icon={<LayoutDashboard className="h-4 w-4" />}
                label="내 대시보드"
                onNavigate={navigate}
              />
              <MenuItem
                href="/my"
                icon={<Heart className="h-4 w-4" />}
                label="찜한 매체"
                onNavigate={navigate}
              />
              <MenuItem
                href="/my/booking-requests"
                icon={<MessageSquare className="h-4 w-4" />}
                label="문의 내역"
                onNavigate={navigate}
              />
              <MenuItem
                href="/account/profile"
                icon={<UserCog className="h-4 w-4" />}
                label="프로필 설정"
                onNavigate={navigate}
              />
              <button
                type="button"
                onClick={handleLogout}
                role="menuitem"
                className="flex w-full items-center gap-2.5 border-t border-border px-3 py-2.5 text-left text-sm font-medium text-foreground/85 transition-colors hover:bg-secondary/60"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>
            </div>
          ) : null}
        </div>
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

function MenuItem({
  href,
  icon,
  label,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      role="menuitem"
      className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-foreground/85 transition-colors hover:bg-secondary/60"
    >
      {icon}
      {label}
    </Link>
  );
}

function labelForRole(role: string): string {
  if (role === "admin") return "관리자";
  if (role === "owner") return "매체사";
  if (role === "agency") return "대행사";
  return "광고주";
}
