"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Eye, Loader2 } from "lucide-react";

type Props = {
  lat?: number | null;
  lng?: number | null;
  mediaName: string;
};

type KakaoLatLng = { equals: (other: KakaoLatLng) => boolean };
type KakaoRoadview = {
  setPanoId: (panoId: number, position: KakaoLatLng) => void;
};
type KakaoRoadviewClient = {
  getNearestPanoId: (
    position: KakaoLatLng,
    radius: number,
    callback: (panoId: number | null) => void,
  ) => void;
};
type KakaoMaps = {
  load: (cb: () => void) => void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  Roadview: new (container: HTMLElement) => KakaoRoadview;
  RoadviewClient: new () => KakaoRoadviewClient;
};

/** Window.kakao 는 lib/media-map/kakao-map-view.tsx 에서도 선언되어 있어
 * 전역 augment 충돌을 피하려 매번 unknown 캐스팅으로 접근한다. */
function getKakaoMaps(): KakaoMaps | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { kakao?: { maps?: KakaoMaps } }).kakao?.maps;
}

function loadKakaoSdkForRoadview(appkey: string): Promise<KakaoMaps> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("SSR"));
      return;
    }
    const existingMaps = getKakaoMaps();
    if (existingMaps) {
      existingMaps.load(() => {
        const m = getKakaoMaps();
        if (m) resolve(m);
        else reject(new Error("kakao.maps undefined after load"));
      });
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-kakao-sdk="1"]`,
    );
    const onReady = () => {
      const m = getKakaoMaps();
      if (!m) {
        reject(new Error("kakao.maps undefined after load"));
        return;
      }
      m.load(() => {
        const ready = getKakaoMaps();
        if (ready) resolve(ready);
        else reject(new Error("kakao.maps undefined after load"));
      });
    };
    if (existing) {
      existing.addEventListener("load", onReady);
      existing.addEventListener("error", () =>
        reject(new Error("Kakao SDK load failed")),
      );
      return;
    }
    const s = document.createElement("script");
    s.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false&libraries=clusterer`;
    s.async = true;
    s.dataset.kakaoSdk = "1";
    s.onload = onReady;
    s.onerror = () => reject(new Error("Kakao SDK load failed"));
    document.head.appendChild(s);
  });
}

/**
 * Kakao 로드뷰 카드.
 * - 좌표 없으면 null 반환.
 * - 사용자가 "로드뷰 보기" 클릭 시 Kakao Maps SDK 로드 + Roadview 인스턴스 생성.
 * - 좌표 근처(50m) 파노라마가 없으면 외부 링크 안내.
 */
export function RoadviewCard({ lat, lng, mediaName }: Props) {
  const t = useTranslations("mediaDetail.roadview");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const externalHref =
    lat != null && lng != null
      ? `https://map.kakao.com/link/roadview/${encodeURIComponent(
          mediaName,
        )},${lat},${lng}`
      : "";

  useEffect(() => {
    if (!open || lat == null || lng == null) return;
    const appkey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
    if (!appkey) {
      setErrorMsg(t("missingKey"));
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);
    (async () => {
      try {
        const maps = await loadKakaoSdkForRoadview(appkey);
        if (cancelled) return;
        const el = containerRef.current;
        if (!el) return;
        const position = new maps.LatLng(lat, lng);
        const roadview = new maps.Roadview(el);
        const client = new maps.RoadviewClient();
        client.getNearestPanoId(position, 50, (panoId) => {
          if (cancelled) return;
          if (panoId == null) {
            setErrorMsg(t("noPanoNearby"));
            setLoading(false);
            return;
          }
          roadview.setPanoId(panoId, position);
          setLoading(false);
        });
      } catch (e) {
        if (cancelled) return;
        console.error("[RoadviewCard] Kakao SDK load failed", e);
        setErrorMsg(t("loadFailed"));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, lat, lng, t]);

  if (lat == null || lng == null) return null;

  return (
    <section className="border-2 border-bx-black bg-bx-white">
      <header className="flex flex-row items-start justify-between gap-3 border-b-2 border-bx-black px-5 py-4 sm:px-6">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            <Eye className="h-3.5 w-3.5" aria-hidden />
            [ ROADVIEW ]
          </p>
          <h3 className="text-lg font-bold tracking-tight text-bx-black">
            {t("title")}
          </h3>
          <p className="font-mono text-[11px] tracking-tight text-bx-gray-dim">
            {t("desc")}
          </p>
        </div>
        <a
          href={externalHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("externalAria")}
          className="inline-flex shrink-0 items-center gap-1.5 border-2 border-bx-black bg-bx-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          {t("openExternal")}
        </a>
      </header>
      <div className="p-5 sm:p-6">
        {open ? (
          <div className="relative aspect-video w-full overflow-hidden border-2 border-bx-black bg-bx-off">
            <div ref={containerRef} className="h-full w-full" />
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-bx-off/90 font-mono text-sm font-bold uppercase tracking-[0.18em] text-bx-black">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-bx-accent" aria-hidden />
                {t("loading")}
              </div>
            ) : null}
            {errorMsg ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bx-white px-6 text-center text-sm text-bx-black">
                <p className="font-bold">{errorMsg}</p>
                <a
                  href={externalHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 border-2 border-bx-black bg-bx-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  {t("openExternal")}
                </a>
              </div>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex aspect-video w-full items-center justify-center border-2 border-bx-black bg-bx-off font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white"
          >
            <Eye className="mr-2 h-4 w-4" aria-hidden />
            {t("loadCta")}
          </button>
        )}
      </div>
    </section>
  );
}
