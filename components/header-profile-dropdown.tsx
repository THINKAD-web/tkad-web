"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronDown, LogOut, Megaphone, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SessionUser = { id: string; email: string; name: string; role: string };

export function HeaderProfileDropdown({
  session,
  onNavigate,
  myPageLabel,
  campaignsLabel,
  logoutLabel,
}: {
  session: SessionUser;
  onNavigate?: () => void;
  myPageLabel: string;
  campaignsLabel: string;
  logoutLabel: string;
}) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const logout = async () => {
    setOpen(false);
    onNavigate?.();
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    window.location.href = `/${locale}/login`;
  };

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-9 items-center gap-1 rounded-full border border-transparent px-2 text-muted-foreground transition-colors",
          "hover:bg-secondary/60 hover:text-foreground dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white",
          open && "bg-secondary/60 dark:bg-white/10",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={session.name}
      >
        <UserIcon className="h-4 w-4 shrink-0" strokeWidth={2} />
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.35rem)] z-[60] min-w-[11.5rem] overflow-hidden rounded-xl border border-border/60 bg-background py-1 shadow-lg dark:border-white/12 dark:bg-[#0a0a12]"
        >
          <p className="truncate px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground dark:text-white/45">
            {session.name}
          </p>
          <Link
            href="/my"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted dark:text-white dark:hover:bg-white/8"
          >
            <UserIcon className="h-4 w-4 opacity-70" />
            {myPageLabel}
          </Link>
          <Link
            href="/dashboard"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted dark:text-white dark:hover:bg-white/8"
          >
            <Megaphone className="h-4 w-4 opacity-70" />
            {campaignsLabel}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => void logout()}
            className="flex w-full items-center gap-2 border-t border-border/60 px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:text-white dark:hover:bg-white/8"
          >
            <LogOut className="h-4 w-4 opacity-70" />
            {logoutLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
