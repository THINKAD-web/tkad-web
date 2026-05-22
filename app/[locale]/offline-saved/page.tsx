"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useSavedMediaList } from "@/components/pwa-save-offline-button";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";

export default function OfflineSavedMediaPage() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const { items } = useSavedMediaList();

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon mx-auto max-w-lg px-4 py-10 dark:text-white text-gray-900">
        <h1 className="text-2xl font-bold">
          {isKo ? "오프라인 저장 매체" : "Offline saved media"}
        </h1>
        <p className="mt-2 text-sm dark:text-white text-gray-500">
          {isKo
            ? "인터넷 없이도 열어볼 수 있는 매체입니다 (최대 20개)."
            : "View these media when offline (up to 20)."}
        </p>
        {items.length === 0 ? (
          <p className="mt-8 text-sm dark:text-white text-gray-400">
            {isKo
              ? "매체 상세에서 「오프라인 저장」을 눌러 추가하세요."
              : "Use Save offline on a media detail page."}
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {items.map((m) => (
              <li key={m.id}>
                <Link
                  href={m.pagePath}
                  className="flex gap-3 rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 p-3 hover:border-cyan-400/30"
                >
                  {m.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.imageUrl}
                      alt=""
                      className="h-16 w-16 rounded-xl object-cover"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="font-semibold">{m.name}</p>
                    <p className="text-xs dark:text-white text-gray-500">
                      {[m.location, m.type].filter(Boolean).join(" · ")}
                      {m.price > 0
                        ? ` · ${formatCatalogPriceFieldWon(m.price)}`
                        : ""}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={`/${locale}`}
          className="mt-8 inline-block text-sm text-cyan-300 hover:underline"
        >
          {isKo ? "홈으로" : "Home"}
        </Link>
      </div>
    </HomeLandingDayNight>
  );
}
