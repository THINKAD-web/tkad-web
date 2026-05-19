"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { Download, Share, X } from "lucide-react";
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
    <InstallBannerPanel
      canNativeInstall={canNativeInstall}
      ios={ios}
      android={android}
      onInstall={() => void install()}
      onDismiss={dismissSession}
      onDismissForever={dismissForever}
    />
  );
}

function InstallBannerPanel({
  canNativeInstall,
  ios,
  android,
  onInstall,
  onDismiss,
  onDismissForever,
}: {
  canNativeInstall: boolean;
  ios: boolean;
  android: boolean;
  onInstall: () => void;
  onDismiss: () => void;
  onDismissForever: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="앱 설치 안내"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[80] border-t border-[#22d3ee]/30",
        "bg-[#020202]/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md",
        "shadow-[0_-12px_48px_rgba(34,211,238,0.12)]",
      )}
    >
      <div className="mx-auto flex max-w-lg items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#22d3ee]/30 bg-[#22d3ee]/10">
          <Download className="h-5 w-5 text-[#22d3ee]" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">
            홈 화면에 추가하면 앱처럼 사용할 수 있어요
          </p>
          {ios && !canNativeInstall ? (
            <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-white/65">
              <Share className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#22d3ee]" />
              Safari 하단 <strong className="text-white">공유</strong> →{" "}
              <strong className="text-white">홈 화면에 추가</strong>
            </p>
          ) : android && !canNativeInstall ? (
            <p className="mt-1 text-xs leading-relaxed text-white/65">
              Chrome 메뉴 <strong className="text-white">⋮</strong> →{" "}
              <strong className="text-white">홈 화면에 추가</strong> 또는{" "}
              <strong className="text-white">앱 설치</strong>
            </p>
          ) : (
            <p className="mt-1 text-xs text-white/55">
              현장 답사·매체 검색을 더 빠르게 실행할 수 있습니다.
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {canNativeInstall ? (
              <button
                type="button"
                onClick={onInstall}
                className="rounded-full border border-[#22d3ee]/40 bg-[#22d3ee]/15 px-4 py-2 text-xs font-bold text-[#22d3ee]"
              >
                설치하기
              </button>
            ) : null}
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/70"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={onDismissForever}
              className="text-xs font-medium text-white/40 underline-offset-2 hover:text-white/60 hover:underline"
            >
              다시 보지 않기
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
