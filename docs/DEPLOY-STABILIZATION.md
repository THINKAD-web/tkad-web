# 배포 안정화 가이드 (실측 기준)

> 코드베이스 직접 점검(2026-04-20) 기반. 추측 아님.

---

## 1. 최근 빌드 실패 5건 공통 원인

| # | 에러 | 원인 | 해결 (적용 완료) |
|---|---|---|---|
| 1 | `Property 'oOHQuote' does not exist on type 'PrismaClient'. Did you mean 'ooHQuote'?` | Prisma 7 delegate 명명 규칙 (연속 대문자 첫 글자만 소문자화) | PR #17 |
| 2 | `Module not found: Can't resolve 'argon2'` (Turbopack) | argon2 native binding이 Vercel build 환경에서 해석 안 됨 | PR #18 (bcryptjs로 교체) |
| 3 | `prisma db push` exit 1 (vercel-build) | CLI가 빌드 환경에서 interactive 모드 진입 / 권한 부족 | PR #20 (vercel-build에서 제거, SQL 수동 적용) |
| 4 | `type "UserRole" already exists` (런타임) | 기존 DB enum과 이름 충돌 | PR #21 (`AppUserRole`로 개명) |
| 5 | 지도 미작동 (`NEXT_PUBLIC_KAKAO_MAP_KEY 미설정`) | 환경변수 이름이 프로젝트 표준(`NEXT_PUBLIC_KAKAO_MAP_APP_KEY`)과 불일치 | PR #22 |

**예방 룰** (이번 사건에서 학습)

1. 새 Prisma 모델 추가 시 **`npx prisma generate` 후 직접 import** — `prisma.<delegateName>` 이름이 IDE 자동완성에 뜨는지 확인
2. native binding 패키지 (argon2 / sharp / bcrypt 등) 도입 전 Vercel 호환 표 확인. 안 맞으면 pure-JS 대안
3. **DB 스키마 변경**과 **코드 변경**은 별도 PR로 분리. 코드 PR 머지 = 빌드만, DB는 SQL 별도 적용
4. Prisma enum 추가 시 **DB에 동일 enum 이름이 있는지 사전 검색** — `\dT` (psql) 또는 SQL `SELECT typname FROM pg_type WHERE typtype='e';`
5. 새 환경변수 이름은 **기존 `grep -rn "NEXT_PUBLIC_" components/`로 컨벤션 확인** 후 통일

---

## 2. Prisma + Edge Runtime 호환 상태 (현재 코드 점검 결과)

### 2.1 Edge에서 실행되는 파일

```
proxy.ts (Next.js 16 미들웨어)
```

**현재 import**: `next-intl/middleware`, `i18n/routing` — **Prisma·argon2·bcrypt·node:crypto 외 모듈 없음** ✅ 안전

### 2.2 Node.js 런타임 명시 라우트 (점검 완료)

```
app/api/auth/register/route.ts        export const runtime = "nodejs"  ✅
app/api/auth/login/route.ts            ✅
app/api/auth/logout/route.ts           ✅
app/api/auth/session/route.ts          ✅
app/api/media/map/route.ts             ✅
app/api/my/favorites/route.ts          ✅
app/api/my/favorite/route.ts           ✅
app/api/my/quotes/route.ts             ✅
app/api/quote/create/route.ts          ✅
app/api/quote/[id]/detail/route.ts     ✅
```

### 2.3 신규 라우트 추가 시 필수 패턴

```ts
import { /* ... */ } from "@/lib/prisma";

// Prisma·bcrypt·jsPDF·node native 모듈 import 시 반드시
export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // 권장 (DB 의존 라우트)

export async function GET() { /* ... */ }
```

### 2.4 Edge 라우트가 필요한 경우 (성능)

검증 토큰만 검사하는 라우트라면 Edge 가능. 단 다음 제약:
- `prisma`, `pg`, `bcryptjs` import 금지
- `node:crypto`는 일부 함수만 작동 (`createHmac`, `createHash` 등 검증된 것만)
- `lib/user-session.ts`의 `verifyUserSessionToken`만 호출하고 DB 조회는 분리

```ts
// 예: app/api/edge-check/route.ts
export const runtime = "edge";

import { verifyUserSessionToken, USER_SESSION_COOKIE } from "@/lib/user-session";
// 단, lib/user-session.ts가 prisma 함수도 같이 export하면 트리쉐이킹 의존 → import 분리 필요
```

> **현재는 Edge 라우트 없음**. 모두 Node.js. Phase 2~3에 SSE/실시간 알림 도입 시 검토.

---

## 3. 환경변수 마스터 리스트 (Production)

`grep -rn "process.env" app lib components` 실측 결과:

### 3.1 필수 — 미설정 시 즉시 500 또는 빌드 실패

| 변수 | 용도 | 사용처 |
|---|---|---|
| `DATABASE_URL` | Postgres 연결 | `lib/prisma.ts` |
| `USER_SESSION_SECRET` | 사용자 세션 HMAC | `lib/user-session.ts` |
| `ADMIN_SESSION_SECRET` | Admin 세션 HMAC | `lib/admin-session.ts` |
| `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` | Kakao Map JS SDK | `components/media-map/kakao-map-view.tsx`, `admin-media-draggable-map.tsx`, `campaign-monitoring-map.tsx` |
| `KAKAO_REST_API_KEY` | 주소 → 좌표 지오코딩 | `app/api/admin/geo/lookup/route.ts` |
| `RESEND_API_KEY` | 이메일 발송 | (이메일 기능 사용 시) |
| `ANTHROPIC_API_KEY` | Claude API | AI 기능 |
| `CLOUDINARY_*` (3개) | 이미지 업로드 | Admin 매체 등록 |

### 3.2 선택 / 옵션

```bash
DATABASE_POOL_MAX=15           # 기본 15
PUBLIC_MEDIA_FORCE_MOCK_CATALOG  # Production에선 반드시 비워둠
ADMIN_AUTH_DEBUG=0
USER_AUTH_DEBUG=0
```

### 3.3 환경변수 관리 SOP

```bash
# 1. 새 변수 추가 시 .env.production.example 동시 업데이트
echo "MY_NEW_VAR=" >> .env.production.example

# 2. 코드에 폴백 처리 — 없으면 명확한 에러
const KEY = process.env.MY_NEW_VAR;
if (!KEY) throw new Error("MY_NEW_VAR is required");

# 3. NEXT_PUBLIC_* 변수는 빌드 타임 주입 → 추가 후 반드시 Redeploy
```

---

## 4. 배포 전 체크리스트 (5분, 매 배포마다)

### 로컬

```bash
# 1. main 동기화
git checkout main && git pull origin main

# 2. 의존성 일치 확인
npm ci   # package-lock 기준 정확 설치

# 3. Prisma generate (스키마 변경 시)
npx prisma generate

# 4. 타입 체크
npx tsc --noEmit

# 5. 린트 (에러만 막음, 워닝 허용)
npm run lint

# 6. 빌드 (Vercel과 동일)
npm run build
# = prisma generate && next build
```

**모두 통과 시에만 push**.

### DB 스키마 변경이 있다면

```bash
# main에 머지 *전*에 prod DB에 SQL 적용 (드리프트 방지)
# Neon SQL Editor에서 schema-only SQL 실행
# CREATE TABLE IF NOT EXISTS / DO $$ BEGIN ... EXCEPTION 패턴 사용
```

### 환경변수 변경이 있다면

```
1. .env.production.example 업데이트 (PR에 포함)
2. Vercel Dashboard → Settings → Environment Variables에 동일 변수명·값 추가
3. NEXT_PUBLIC_* 변수면 Deployments → Redeploy 클릭 (build 타임 주입)
```

---

## 5. 배포 후 5분 스모크 테스트

```bash
# 모든 응답 200 / 200 / 200 / 200 / 200 떠야 함
curl -I https://tkad-web.vercel.app/                  # 랜딩
curl -I https://tkad-web.vercel.app/ko/media          # 매체 검색 (기존)
curl -I https://tkad-web.vercel.app/ko/media/map      # 지도
curl -I https://tkad-web.vercel.app/ko/login          # 로그인 폼
curl -s "https://tkad-web.vercel.app/api/media/map?priceMin=0" | head -c 200
```

브라우저:
- `/ko/register` 가입 → `/ko/my` 자동 이동 + 토스트 노출
- `/ko/media/map` 지도 + 마커 표시 + Verified Only 필터 작동
- 매체 카드 "제안서에 담기" → 토스트 + 우상단 GNB 장바구니 카운트 변화

---

## 6. Vercel 프로젝트 설정 권장값

### Build & Development Settings

```
Framework Preset:     Next.js
Build Command:        prisma generate && next build  (현재 vercel-build 그대로)
Output Directory:     .next
Install Command:      npm ci
Node.js Version:      20.x  (.nvmrc 기준)
```

### Functions

| 영역 | 권장 |
|---|---|
| Region | `icn1` (Seoul) — KR 사용자 우선 |
| Memory | 1024 MB (PDF 생성 라우트만 1700~3008 MB 검토) |
| Max Duration | 30s (Hobby 10s, Pro 60s) — PDF 생성 시 60s 권장 |

PDF 라우트만 별도 설정하려면 `vercel.json`에 추가:

```json
{
  "functions": {
    "app/api/quote/[id]/pdf/route.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  }
}
```

### Edge / Region

- 모든 API가 Node.js 런타임 → Edge 캐시 효과 없음
- **정적 페이지** (랜딩, /cases, /insights)만 ISR/Edge 캐시 활용. 현재 별도 설정 없음 (기본 동작)

### Caching

`vercel.json` 현재 설정:
- 모든 `/api/*`: `Cache-Control: no-store, max-age=0` ✅
- 정적: 기본 (Vercel Edge가 자동)

권장 추가 (정적 자산):
```json
{
  "source": "/_next/static/(.*)",
  "headers": [
    { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
  ]
}
```
> Next.js가 이미 자동으로 immutable 헤더를 부여하므로 **불필요**. 추가 시 중복.

---

## 7. 빌드 최적화 (현재 vs 권장)

### 현재 상태

```json
"vercel-build": "prisma generate && next build"
```

빌드 시간 측정값 (로컬): `prisma generate` 0.5s + `next build` 13~17s = **약 18s**

### 권장 변경 (즉시 적용 가능)

**(a) Turbopack 의존 모듈 명시 (`next.config.ts`)**
이미 `optimizePackageImports: ["lucide-react"]` 적용됨 ✅

**(b) 사용 중인 `lucide-react` 추가 패키지 트리쉐이킹** — 이미 적용

**(c) Prisma binary 최적화** (Vercel 자동 detect, 별도 설정 불필요)

### 빌드 캐시 활용

Vercel 기본적으로 `.next/cache` 캐싱. 별도 설정 불필요.

`package-lock.json`을 항상 커밋해서 `npm ci` 재현성 보장 (현재 OK).

---

## 8. 문제 발생 시 빠른 롤백

### 코드 롤백

```
Vercel Dashboard → Deployments → 이전 ● Ready 배포 → "..." → "Promote to Production"
```

5초 안에 직전 안정 버전으로 복귀.

### DB 롤백 (현재 변경분 한정)

신규 테이블만 추가됐으므로 데이터 무관:

```sql
DROP TABLE IF EXISTS "user_favorite_medias";
DROP TABLE IF EXISTS "user_sessions";
DROP TABLE IF EXISTS "users";
DROP TYPE  IF EXISTS "AppUserRole";
```

기존 28개 모델 무영향.

---

## 9. 모니터링 권장 (Phase 1 베타 출시 후)

- **Sentry** 통합: `@sentry/nextjs` (env `SENTRY_DSN`만 추가하면 자동 작동)
- **Vercel Analytics**: Project Settings → Analytics 토글 ON (Web Vitals 자동 수집)
- **Vercel Log Drains**: 에러율 5% 초과 시 Slack alert (Pro 플랜)

---

## 10. 정기 점검 (월 1회 5분)

- [ ] `npm audit` 보안 취약점 검토
- [ ] `npx npm-check-updates -u` 의존성 업데이트 후 빌드 테스트
- [ ] Prisma `npx prisma migrate diff` 로 스키마 ↔ DB 드리프트 확인
- [ ] Vercel Functions 사용량 (Hobby 100GB-Hr / Pro 1000GB-Hr 한도)
- [ ] Anthropic / Cloudinary / Resend 월 비용 vs 예산 cap

---

## 핵심 요약

| 항목 | 상태 | 액션 |
|---|---|---|
| Prisma + Edge 분리 | ✅ proxy.ts에 prisma 없음 | 신규 라우트 추가 시 `runtime = "nodejs"` 필수 |
| 환경변수 일관성 | ✅ 모두 식별 | 추가 시 `.env.production.example` 동기화 |
| Native binding | ✅ argon2 → bcryptjs | 신규 패키지는 pure-JS 우선 |
| DB 마이그레이션 | ⚠️ 수동 SQL | 코드 PR과 분리해서 main 머지 *전* 적용 |
| 빌드 시간 | ✅ ~18s | 추가 최적화 불필요 |
| 롤백 경로 | ✅ Vercel Promote 1클릭 | DB 변경 시 신규 테이블만 DROP |
