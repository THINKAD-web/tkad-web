"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  GitCompare,
  MessageCircle,
  Phone,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/haptic";

const PHONE = "02-515-2772";

export function FloatingQuickAction() {
  const pathname = usePathname();
  const locale = useLocale();
  const isKo = locale === "ko";
  const [open, setOpen] = useState(false);

  const hidden =
    pathname.includes("/admin") ||
    pathname.includes("/login") ||
    pathname.includes("/register");

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (hidden) return null;

  const actions = [
    {
      id: "quote",
      label: isKo ? "무료 견적 문의" : "Free quote",
      href: "/contact",
      icon: MessageCircle,
      emoji: "💬",
    },
    {
      id: "planner",
      label: isKo ? "AI 플래너 시작" : "AI planner",
      href: "/planner",
      icon: Sparkles,
      emoji: "🎯",
    },
    {
      id: "compare",
      label: isKo ? "매체 비교하기" : "Compare media",
      href: "/compare",
      icon: GitCompare,
      emoji: "📋",
    },
    {
      id: "phone",
      label: isKo ? `전화 상담 (${PHONE})` : `Call ${PHONE}`,
      href: `tel:${PHONE.replace(/-/g, "")}`,
      icon: Phone,
      emoji: "📞",
      external: true,
    },
  ];

  return (
    <div
      className="fixed bottom-6 right-4 z-50 hidden flex-col items-end gap-3 md:flex"
      style={{
        bottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
        right: "max(1rem, env(safe-area-inset-right, 0px))",
      }}
    >
      {open ? (
        <ul className="space-y-2">
          {actions.map((action) => (
            <li key={action.id}>
              {action.external ? (
                <a
                  href={action.href}
                  className="flex items-center gap-2 rounded-full border border-gray-200 bg-white py-2 pl-3 pr-4 text-sm font-semibold text-gray-900 shadow-lg transition-transform hover:scale-[1.02] dark:border-white/10 dark:bg-[#0a0a12] dark:text-white"
                  onClick={() => {
                    hapticLight();
                    setOpen(false);
                  }}
                >
                  <span aria-hidden>{action.emoji}</span>
                  {action.label}
                </a>
              ) : (
                <Link
                  href={action.href}
                  className="flex items-center gap-2 rounded-full border border-gray-200 bg-white py-2 pl-3 pr-4 text-sm font-semibold text-gray-900 shadow-lg transition-transform hover:scale-[1.02] dark:border-white/10 dark:bg-[#0a0a12] dark:text-white"
                  onClick={() => {
                    hapticLight();
                    setOpen(false);
                  }}
                >
                  <span aria-hidden>{action.emoji}</span>
                  {action.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={() => {
          hapticLight();
          setOpen((v) => !v);
        }}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95",
          "bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-violet-500/30",
          open && "rotate-45",
        )}
        aria-label={open ? (isKo ? "닫기" : "Close") : (isKo ? "빠른 액션" : "Quick actions")}
        aria-expanded={open}
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" strokeWidth={2.5} />}
      </button>
    </div>
  );
}
