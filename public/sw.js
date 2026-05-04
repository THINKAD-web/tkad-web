/**
 * THINKAD PWA Service Worker
 *
 * 정책:
 *   - GET 만 캐싱 (POST/PATCH/DELETE 캐싱 금지)
 *   - admin / api / next data 는 캐싱 X (보안·신선도)
 *   - 정적 자산: cache-first (즉시 응답, 백그라운드 갱신)
 *   - 페이지 navigation: network-first → 실패 시 /offline 폴백
 *   - 캐시 버전(CACHE_NAME) 변경 시 자동 정리
 *
 * 운영 안전:
 *   - 카탈로그/매체 데이터 응답 캐싱하지 않음 (DB 가 source of truth)
 *   - 견적·인증·로그인 등 민감 경로 모두 SW 우회
 */

const CACHE_NAME = "thinkad-pwa-v2";
const APP_SHELL = ["/offline", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // 실패해도 install 막지 않도록 add 개별 처리
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // 같은 origin 만 처리 (외부 CDN, 카카오, Cloudinary 등은 SW 우회)
  if (url.origin !== self.location.origin) return;

  // 보안/신선도 — SW 우회
  if (
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/_next/data") ||
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/register") ||
    url.pathname.includes("/auth")
  ) {
    return;
  }

  // 페이지 navigation: network-first → 오프라인 시 /offline 폴백
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const offline = await caches.match("/offline");
        return (
          offline ||
          new Response(
            "<h1>Offline</h1><p>네트워크 연결을 확인해주세요.</p>",
            { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
          )
        );
      }),
    );
    return;
  }

  // 정적 자산: cache-first + 백그라운드 갱신 (stale-while-revalidate)
  const isStatic =
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/pwa-icon/") ||
    /\.(png|jpe?g|svg|gif|webp|woff2?|ttf|otf|css|js|ico)$/i.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response && response.ok && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, clone).catch(() => {
                  /* QuotaExceeded 등 무시 */
                });
              });
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      }),
    );
  }
});

// 사용자가 새 SW 활성화 즉시 갱신 원할 때 메시지로 trigger
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
