"use client";

import { useTranslations } from "next-intl";
import { ExternalLink, Eye } from "lucide-react";

type Props = {
  lat?: number | null;
  lng?: number | null;
  mediaName: string;
};

/** Kakao 로드뷰 링크 — `/link/roadview/위도,경도` 만 지원 (이름 파라미터 없음) */
function kakaoRoadviewHref(lat: number, lng: number): string {
  const y = Number(lat.toFixed(7));
  const x = Number(lng.toFixed(7));
  return `https://map.kakao.com/link/roadview/${y},${x}`;
}

/**
 * 로드뷰 — Kakao SDK 없이 외부 링크로 연결 (공개 페이지는 Carto 다크 지도 사용).
 */
export function RoadviewCard({ lat, lng, mediaName }: Props) {
  const t = useTranslations("mediaDetail.roadview");

  if (lat == null || lng == null) return null;

  const externalHref = kakaoRoadviewHref(lat, lng);

  return (
    <div className="overflow-hidden rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-300/80">
            <Eye className="h-3.5 w-3.5" aria-hidden />
            {t("title")}
          </p>
          <p className="mt-2 text-sm dark:text-white/70 text-gray-600">
            {t("desc")}
          </p>
        </div>
        <a
          href={externalHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("iframeTitle", { name: mediaName })}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-600 transition hover:bg-violet-500/20 dark:text-violet-300"
        >
          {t("openExternal")}
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </div>
    </div>
  );
}
