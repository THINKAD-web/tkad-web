/**
 * Kakao Maps JavaScript SDK 로더.
 * `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` — 매체 상세·어드민·(레거시) 공개 지도 목록.
 * 공개 매체 목록/탐색 지도는 Leaflet/Carto (`components/public-map/dark-map-view.tsx`).
 */

export function getAdminKakaoMapAppKey(): string | null {
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

export function adminKakaoMapsSdkUrl(appkey: string): string {
  return `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appkey)}&autoload=false`;
}

export function loadAdminKakaoMapsSdk(appkey?: string): Promise<void> {
  const key = appkey?.trim() || getAdminKakaoMapAppKey();
  if (!key) {
    return Promise.reject(
      new Error(
        "NEXT_PUBLIC_KAKAO_MAP_APP_KEY 미설정 — 어드민 매체 등록 지도 전용 JavaScript 키가 필요합니다.",
      ),
    );
  }

  const sdkUrl = adminKakaoMapsSdkUrl(key);

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("SSR"));
      return;
    }

    type MapsApi = { load: (cb: () => void) => void };
    const mapsApi = (): MapsApi | undefined =>
      (window as unknown as { kakao?: { maps?: MapsApi } }).kakao?.maps;

    const runKakaoLoad = () => {
      const maps = mapsApi();
      if (maps?.load) {
        maps.load(() => resolve());
        return;
      }
      reject(new Error("kakao.maps 가 없습니다."));
    };

    if (mapsApi()?.load) {
      runKakaoLoad();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-kakao-admin-sdk="1"]`,
    );
    if (existing) {
      existing.addEventListener("load", runKakaoLoad, { once: true });
      existing.addEventListener("error", () =>
        reject(new Error("Kakao SDK load failed")),
      );
      queueMicrotask(() => {
        if (mapsApi()?.load) runKakaoLoad();
      });
      return;
    }

    const s = document.createElement("script");
    s.src = sdkUrl;
    s.async = true;
    s.dataset.kakaoAdminSdk = "1";
    s.onload = () => runKakaoLoad();
    s.onerror = () => reject(new Error("Kakao SDK load failed"));
    document.head.appendChild(s);
  });
}

export function getAdminKakaoMapsApi(): unknown {
  return (window as unknown as { kakao?: { maps?: unknown } }).kakao?.maps;
}
