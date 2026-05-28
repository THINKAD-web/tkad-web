/**
 * Kakao Maps JavaScript SDK — 공개·어드민 공통 로더.
 * `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` (REST API 키와 별도 JS 키)
 */

const SDK_SCRIPT_ATTR = "data-kakao-maps-sdk";

export const KAKAO_MAP_SDK_LOAD_FAILED_KO =
  "카카오 지도 SDK를 불러오지 못했습니다. JavaScript 키(NEXT_PUBLIC_KAKAO_MAP_APP_KEY)·카카오 디벨로퍼스 「JS SDK 도메인」에 브라우저 origin을 등록·.env 변경 후 dev 재시작·네트워크를 확인하세요.";

export function getKakaoMapAppKey(): string | null {
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

/** @deprecated use getKakaoMapAppKey */
export const getAdminKakaoMapAppKey = getKakaoMapAppKey;

export function kakaoMapsSdkUrl(appkey: string, libraries?: string): string {
  const base = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appkey)}&autoload=false`;
  if (!libraries?.trim()) return base;
  return `${base}&libraries=${encodeURIComponent(libraries.trim())}`;
}

/** @deprecated use kakaoMapsSdkUrl */
export const adminKakaoMapsSdkUrl = (appkey: string) => kakaoMapsSdkUrl(appkey);

type LoadOptions = {
  appkey?: string;
  /** e.g. `clusterer` for public map list */
  libraries?: string;
};

export function loadKakaoMapsSdk(options: LoadOptions = {}): Promise<void> {
  const key = options.appkey?.trim() || getKakaoMapAppKey();
  if (!key) {
    return Promise.reject(
      new Error(
        "NEXT_PUBLIC_KAKAO_MAP_APP_KEY 미설정 (KAKAO_REST_API_KEY 와 다릅니다 — 지도는 JS 키가 필요합니다)",
      ),
    );
  }

  const sdkUrl = kakaoMapsSdkUrl(key, options.libraries);

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
      reject(
        new Error(
          "kakao.maps 가 없습니다. JavaScript 키와 Web 사이트 도메인을 카카오 디벨로퍼스에서 확인하세요.",
        ),
      );
    };

    if (mapsApi()?.load) {
      runKakaoLoad();
      return;
    }

    const existing =
      document.querySelector<HTMLScriptElement>(`script[${SDK_SCRIPT_ATTR}]`) ??
      document.querySelector<HTMLScriptElement>(
        'script[src*="dapi.kakao.com/v2/maps/sdk.js"]',
      );

    if (existing) {
      const onScriptError = () => reject(new Error(KAKAO_MAP_SDK_LOAD_FAILED_KO));
      existing.addEventListener("load", runKakaoLoad, { once: true });
      existing.addEventListener("error", onScriptError, { once: true });
      queueMicrotask(() => {
        if (mapsApi()?.load) runKakaoLoad();
      });
      return;
    }

    const s = document.createElement("script");
    s.src = sdkUrl;
    s.async = true;
    s.setAttribute(SDK_SCRIPT_ATTR, "1");
    s.onload = () => runKakaoLoad();
    s.onerror = () => reject(new Error(KAKAO_MAP_SDK_LOAD_FAILED_KO));
    document.head.appendChild(s);
  });
}

/** @deprecated use loadKakaoMapsSdk */
export function loadAdminKakaoMapsSdk(appkey?: string): Promise<void> {
  return loadKakaoMapsSdk({ appkey });
}

export function getKakaoMapsApi(): unknown {
  return (window as unknown as { kakao?: { maps?: unknown } }).kakao?.maps;
}

/** @deprecated use getKakaoMapsApi */
export const getAdminKakaoMapsApi = getKakaoMapsApi;
