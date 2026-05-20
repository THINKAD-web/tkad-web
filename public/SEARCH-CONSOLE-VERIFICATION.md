# Search Console / 서치어드바이저 인증

## Google (메타 태그)

Vercel 환경 변수:

```
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=발급코드
```

## Google (HTML 파일)

Search Console에서 `googleXXXXXXXX.html` 을 받았다면 이 폴더(`public/`)에 그대로 추가하세요.

## 네이버 (메타 태그)

```
NEXT_PUBLIC_NAVER_SITE_VERIFICATION=발급코드
```

## Sitemap ping

주 1회 Vercel Cron이 `/api/ping-sitemap` 을 호출합니다. `CRON_SECRET` 이 설정되어 있어야 합니다.

수동 실행:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  "https://tkad.co.kr/api/ping-sitemap"
```
