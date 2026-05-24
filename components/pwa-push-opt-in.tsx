"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useLocale } from "next-intl";
import {
  dismissPushPrompt,
  shouldShowPushPrompt,
  subscribeToWebPush,
} from "@/lib/pwa-push-client";

export function PwaPushOptIn() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setVisible(shouldShowPushPrompt());
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[55] mx-auto max-w-md md:bottom-24 md:left-auto md:right-4">
      <div className="rounded-2xl border border-violet-400/35 bg-white p-4 shadow-xl backdrop-blur dark:border-white/12 dark:bg-gray-900">
        <div className="flex gap-3">
          <Bell className="h-5 w-5 shrink-0 text-violet-300" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold dark:text-white text-gray-900">
              {isKo ? "알림을 받아보시겠어요?" : "Enable notifications?"}
            </p>
            <p className="mt-1 text-xs dark:text-white text-gray-500">
              {isKo
                ? "찜한 매체 예약 가능, 견적 도착, 캠페인 D-1을 알려드립니다."
                : "Get alerts for favorites, quotes, and campaign reminders."}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={busy}
                className="rounded-full bg-violet-500 px-4 py-2 text-xs font-bold dark:text-white text-gray-900"
                onClick={async () => {
                  setBusy(true);
                  await subscribeToWebPush();
                  dismissPushPrompt();
                  setVisible(false);
                  setBusy(false);
                }}
              >
                {isKo ? "알림 켜기" : "Enable"}
              </button>
              <button
                type="button"
                className="rounded-full border dark:border-white/20 border-gray-300 px-4 py-2 text-xs dark:text-white text-gray-600"
                onClick={() => {
                  dismissPushPrompt();
                  setVisible(false);
                }}
              >
                {isKo ? "나중에" : "Later"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
