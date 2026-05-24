/** Kakao JavaScript SDK — 매체 공유 (feed) */

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: {
        sendDefault: (opts: Record<string, unknown>) => void;
      };
    };
  }
}

let sdkPromise: Promise<void> | null = null;

function getJsKey(): string | null {
  return process.env.NEXT_PUBLIC_KAKAO_JS_KEY?.trim() || null;
}

export function isKakaoShareAvailable(): boolean {
  return Boolean(getJsKey());
}

function loadKakaoSdk(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no window"));
  }
  if (window.Kakao?.isInitialized?.()) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  const key = getJsKey();
  if (!key) return Promise.reject(new Error("Kakao JS key not configured"));

  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-kakao-js="1"]');
    if (existing) {
      existing.addEventListener("load", () => {
        try {
          window.Kakao?.init(key);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      return;
    }
    const s = document.createElement("script");
    s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
    s.crossOrigin = "anonymous";
    s.async = true;
    s.dataset.kakaoJs = "1";
    s.onload = () => {
      try {
        window.Kakao?.init(key);
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    s.onerror = () => reject(new Error("Kakao SDK load failed"));
    document.head.appendChild(s);
  });

  return sdkPromise;
}

export type KakaoMediaShareParams = {
  title: string;
  description: string;
  imageUrl: string;
  pageUrl: string;
};

export async function shareMediaViaKakao(params: KakaoMediaShareParams): Promise<void> {
  await loadKakaoSdk();
  if (!window.Kakao?.Share) {
    throw new Error("Kakao.Share unavailable");
  }
  const link = params.pageUrl;
  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title: params.title,
      description: params.description,
      imageUrl: params.imageUrl,
      link: {
        mobileWebUrl: link,
        webUrl: link,
      },
    },
    buttons: [
      {
        title: "매체 보기",
        link: {
          mobileWebUrl: link,
          webUrl: link,
        },
      },
    ],
  });
}
