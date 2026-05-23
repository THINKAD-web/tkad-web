"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "tkad-pwa-install-dismissed";
const VIEWS_KEY = "tkad-pwa-page-views";
const MIN_VIEWS = 3;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function PwaInstallBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    if (!pathname) return;

    const path = window.location.pathname;
    if (
      path.startsWith("/admin") ||
      path.startsWith("/login") ||
      path.startsWith("/register") ||
      path.startsWith("/offline")
    ) {
      return;
    }

    const seen = new Set(
      JSON.parse(localStorage.getItem(VIEWS_KEY) ?? "[]") as string[],
    );
    seen.add(pathname);
    localStorage.setItem(VIEWS_KEY, JSON.stringify([...seen]));

    if (seen.size >= MIN_VIEWS) {
      setVisible(true);
    }
  }, [pathname]);

  const dismissForever = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }, []);

  const dismissSession = useCallback(() => {
    setVisible(false);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismissForever();
  }, [deferred, dismissForever]);

  if (!visible || isStandalone()) return null;

  const canNativeInstall = Boolean(deferred);
  const ios = isIos();
  const android = isAndroid();

  return (
    <div
      role="dialog"
      aria-label="앱 설치 안내"
      className={cn(
        "fixed bottom-20 left-0 right-0 z-40 md:bottom-0",
        "border-t border-gray-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        "dark:border-white/10 dark:bg-gray-900",
      )}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-900 dark:text-white">
            📱 홈 화면에 추가하면 앱처럼 사용할 수 있어요
          </p>
          {ios && !canNativeInstall ? (
            <p className="mt-0.5 text-xs text-gray-400 dark:text-white/50">
              Safari 공유 → 홈 화면에 추가
            </p>
          ) : android && !canNativeInstall ? (
            <p className="mt-0.5 text-xs text-gray-400 dark:text-white/50">
              Chrome 메뉴 → 홈 화면에 추가
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-gray-400 dark:text-white/50">
              현장 답사·매체 검색을 더 빠르게 실행할 수 있습니다.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canNativeInstall ? (
            <button
              type="button"
              onClick={() => void install()}
              className="rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-500"
            >
              추가하기
            </button>
          ) : (
            <button
              type="button"
              onClick={dismissSession}
              className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 dark:border-white/15 dark:text-white"
            >
              추가하기
            </button>
          )}
          <button
            type="button"
            onClick={dismissForever}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600 dark:text-white/50 dark:hover:text-white/70"
          >
            다시 보지 않기
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
