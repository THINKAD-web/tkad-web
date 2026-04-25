"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Eye, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

declare global {
  interface Window {
    kakao?: { maps?: KakaoMaps };
  }
}

function loadKakaoSdkForRoadview(appkey: string): Promise<KakaoMaps> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("SSR"));
      return;
    }
    if (window.kakao?.maps) {
      window.kakao.maps.load(() => {
        if (window.kakao?.maps) resolve(window.kakao.maps);
        else reject(new Error("kakao.maps undefined after load"));
      });
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-kakao-sdk="1"]`,
    );
    const onReady = () => {
      window.kakao?.maps?.load(() => {
        if (window.kakao?.maps) resolve(window.kakao.maps);
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
    <Card className="border-navy/10 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-navy">
            <Eye className="h-5 w-5 text-gold" aria-hidden />
            {t("title")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("desc")}</p>
        </div>
        <Button
          type="button"
          asChild
          variant="outline"
          size="sm"
          className="rounded-full border-navy/20"
        >
          <a
            href={externalHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("externalAria")}
          >
            <ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden />
            {t("openExternal")}
          </a>
        </Button>
      </CardHeader>
      <CardContent>
        {open ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-navy/10 bg-slate-100">
            <div ref={containerRef} className="h-full w-full" />
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100/85 text-sm font-semibold text-navy">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-gold" aria-hidden />
                {t("loading")}
              </div>
            ) : null}
            {errorMsg ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/95 px-6 text-center text-sm text-navy">
                <p className="font-semibold">{errorMsg}</p>
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <a
                    href={externalHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden />
                    {t("openExternal")}
                  </a>
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex aspect-video w-full items-center justify-center rounded-xl border-2 border-dashed border-navy/15 bg-slate-50 text-sm font-semibold text-navy transition hover:border-gold/40 hover:bg-gold/5"
          >
            <Eye className="mr-2 h-4 w-4 text-gold" aria-hidden />
            {t("loadCta")}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
