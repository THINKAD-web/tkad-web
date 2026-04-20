# 배포 체크리스트

## 1. 환경변수 (Vercel Dashboard)

### 필수 (Production)

```bash
# === DB ===
DATABASE_URL=postgres://...             # Neon/Supabase 프로덕션
DATABASE_POOL_MAX=15

# === App ===
APP_URL=https://thinkad.kr
NEXT_PUBLIC_APP_URL=https://thinkad.kr
NODE_ENV=production

# === Admin 세션 (기존) ===
ADMIN_SESSION_SECRET=                   # openssl rand -base64 48
ADMIN_USERNAME=admin
ADMIN_PASSWORD=                         # 강력한 값

# === User 세션 (Sprint 1 신규) ===
USER_SESSION_SECRET=                    # openssl rand -base64 48, ADMIN_SESSION_SECRET과 다른 값

# === 지도 ===
NEXT_PUBLIC_KAKAO_MAP_KEY=              # Kakao JS 앱키

# === 이메일 (기존) ===
RESEND_API_KEY=
RESEND_FROM_EMAIL=no-reply@thinkad.kr
```

### 선택 (Preview·Staging 별도)

```bash
# Staging 전용 DB 권장 (Neon branch)
DATABASE_URL=postgres://staging...
APP_URL=https://staging.thinkad.kr
USER_SESSION_SECRET=                    # staging 전용 값
NEXT_PUBLIC_KAKAO_MAP_KEY=              # staging 키
```

### 디버그 플래그

```bash
ADMIN_AUTH_DEBUG=0
USER_AUTH_DEBUG=0
PUBLIC_MEDIA_FORCE_MOCK_CATALOG=        # 반드시 비워둠 (프로덕션에선 mock 금지)
```

---

## 2. 배포 전 명령어

### 로컬에서 최종 점검

```bash
# 1. 의존성 설치 (argon2, jose, zod 추가되었음)
npm i argon2@^0.41.1 jose@^5.9.6 zod@^3.24.1
npm i -D @types/argon2@^0.15.1

# 2. Prisma 스키마 반영 (User, UserSession, UserFavoriteMedia 신규)
npm run db:push

# 3. Prisma Client 재생성
npx prisma generate

# 4. 타입 체크
npx tsc --noEmit

# 5. 린트
npm run lint

# 6. 빌드 (Vercel과 동일 경로 검증)
npm run build
```

### Git 푸시

```bash
git add .
git commit -m "..."
git push origin <branch>
```

Vercel은 푸시 감지 시 자동으로 `vercel-build` 스크립트 실행 (`prisma generate && next build`).

---

## 3. Prisma 마이그레이션

### 개발/Staging

```bash
npm run db:push
```

### Production

**`prisma migrate deploy`를 쓰지 않고** 현재 프로젝트는 `db:push` 기반 흐름.

첫 배포 시:
1. Vercel Production DB에 `prisma db push` 수동 실행 필요
2. 로컬에서 `DATABASE_URL=<prod>` 로 `npx prisma db push` 1회

또는 Vercel Dashboard → Deployments → ... → Redeploy 전에 빌드 명령 일시 변경:
```bash
prisma db push --accept-data-loss && prisma generate && next build
```

**주의**: `--accept-data-loss` 는 프로덕션에서 기존 컬럼 삭제 시 데이터 손실. 현재 변경은 **모두 append-only**라 안전.

---

## 4. 배포 후 스모크 테스트

```bash
# 1. 헬스체크
curl https://thinkad.kr/api/health

# 2. 매체 목록 (DB 연결 확인)
curl "https://thinkad.kr/api/media/map?priceMin=0" | jq '.data.total'

# 3. 회원가입
curl -X POST https://thinkad.kr/api/auth/register \
  -H "Content-Type: application/json" \
  -c /tmp/c.txt \
  -d '{"email":"smoke@test.com","password":"smoketest123","name":"smoke"}'

# 4. 세션 확인
curl https://thinkad.kr/api/auth/session -b /tmp/c.txt

# 5. 로그인
curl -X POST https://thinkad.kr/api/auth/login \
  -H "Content-Type: application/json" \
  -c /tmp/c.txt \
  -d '{"email":"smoke@test.com","password":"smoketest123"}'
```

---

## 5. Vercel 배포 시 주의사항

### 5.1 Edge vs Node 런타임

| 파일 | 런타임 | 이유 |
|---|---|---|
| `proxy.ts` | **Edge (강제)** | matcher 경로 매칭. `prisma` / `argon2` import 금지 |
| `app/api/auth/**/route.ts` | **Node** (`export const runtime = "nodejs"`) | `argon2`, `prisma` 사용 |
| `app/api/media/map/route.ts` | Node | `prisma` 사용 |
| `app/api/quote/**/route.ts` | Node | `prisma` + `jsPDF` |
| `app/api/my/**/route.ts` | Node | `prisma` |

모든 새 API에 **`export const runtime = "nodejs"` 명시 완료**.

### 5.2 Vercel 함수 제한

| 제한 | 값 | 영향 |
|---|---|---|
| Max execution time (Hobby) | 10s | PDF 생성 시간 확인 필요 |
| Max execution time (Pro) | 60s | 여유 |
| Max response size | 4.5MB | PDF 용량 확인 (일반 2~3MB 예상) |

PDF 생성은 `lib/build-quote-pdf.ts` 기반, **10초 이내 완료 확인 필수**.

### 5.3 Cookie · HTTPS

- `secure: process.env.NODE_ENV === "production"` 이미 적용
- `sameSite: "lax"` — Kakao OAuth redirect 허용
- Vercel 프로덕션은 기본 HTTPS → 문제 없음

### 5.4 환경변수 주입 타이밍

- `USER_SESSION_SECRET`이 비어있으면 **dev fallback 값 사용 (프로덕션에선 미발급 → 500 에러)**
- `getCurrentUser` 호출 시 `SESSION_SECRET_MISSING` 응답 → 배포 직후 반드시 확인

### 5.5 Prisma Client 생성

- `postinstall` 훅: `prisma generate && node scripts/ensure-noto-kr-font.mjs`
- `vercel-build`: `prisma generate && next build`
- 이미 자동화됨

---

## 6. 배포 전 최종 체크리스트

### 코드

- [ ] `npm run build` 로컬 성공
- [ ] `npx tsc --noEmit` 타입 에러 0
- [ ] `npm run lint` 워닝만 허용 (에러 0)
- [ ] 모든 신규 API 라우트에 `export const runtime = "nodejs"` 명시
- [ ] 모든 신규 API 라우트에 최상위 `try/catch` 적용

### DB

- [ ] Production DB에 `prisma db push` 반영 (User, UserSession, UserFavoriteMedia 테이블 3개 신규)
- [ ] `npx prisma studio` 로 테이블 존재 확인
- [ ] 기존 28개 모델 무변경 확인

### 환경변수

- [ ] `USER_SESSION_SECRET` Production 발급 및 설정
- [ ] `NEXT_PUBLIC_KAKAO_MAP_KEY` Production 세팅
- [ ] `PUBLIC_MEDIA_FORCE_MOCK_CATALOG` 비어있음 확인

### 기능 스모크 (배포 후)

- [ ] `/` 랜딩 정상
- [ ] `/ko/media/map` 지도 + 마커 표시
- [ ] 지도 이동 시 좌측 리스트 업데이트
- [ ] 매체 "제안서에 담기" → `/ko/cart` 반영
- [ ] `/ko/register` 가입 성공 → 쿠키 발급 확인
- [ ] `/ko/login` 로그인 성공
- [ ] `/ko/my` 진입 (요약 카드 3종)
- [ ] `/ko/cart` → 제안서 생성 → `/ko/quote/[id]/preview` 이동
- [ ] PDF 다운로드 (<10초)

### 모니터링

- [ ] Sentry DSN 연결 (있다면)
- [ ] Vercel Analytics 활성
- [ ] 에러율 첫 1시간 < 5% 확인

---

## 7. 롤백

문제 발생 시:

1. Vercel Dashboard → Deployments → 이전 배포 → **"Promote to Production"**
2. DB 스키마 롤백 필요 시: 신규 테이블 3개만 DROP (append-only라 안전)

```sql
DROP TABLE "user_favorite_medias";
DROP TABLE "user_sessions";
DROP TABLE "users";
DROP TYPE "UserRole";
```
