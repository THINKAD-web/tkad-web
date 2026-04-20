# Sprint 1 Tech Spec — 인증 시스템 + 기본 대시보드

> 프로젝트: THINKAD (tkad-web) · 대상 브랜치: `claude/write-prd-v2-yDYGn`
> 작성 기준: 실제 `package.json` · `prisma/schema.prisma` · `proxy.ts` · `lib/admin-session.ts` 코드 분석 반영
> 구현 시점: 이 문서대로 바로 착수 가능

---

## 1. 기술 스택 최종 확정 (현재 `package.json` 기준 · 변경 없음)

| 영역 | 버전·라이브러리 | 이미 설치됨 |
|---|---|---|
| Framework | `next@^16.2.3` (App Router) | ✅ |
| UI Runtime | `react@19.2.4` · `react-dom@19.2.4` | ✅ |
| Language | TypeScript 5 (strict) | ✅ |
| Styling | Tailwind CSS 4 + `@tailwindcss/postcss` | ✅ |
| UI Primitives | `radix-ui@^1.4.3` + `components.json` (shadcn) | ✅ |
| ORM | `prisma@^7.6.0` + `@prisma/client@^7.6.0` + `@prisma/adapter-pg@^7.6.0` | ✅ |
| DB Driver | `pg@^8.20.0` | ✅ |
| i18n | `next-intl@^4.8.3` (routing: `/[locale]/*`) | ✅ |
| Email | `resend@^4.8.0` + `nodemailer@^8.0.5` (백업) | ✅ |
| Motion | `framer-motion@^12.38.0` | ✅ |
| Icons | `lucide-react@^1.7.0` | ✅ |
| PDF | `jspdf@^4.2.1` + `@pdfme/common@^5.5.10` + `html2canvas@^1.4.1` | ✅ |
| AI | `@anthropic-ai/sdk@^0.88.0` | ✅ |
| Media 저장 | `cloudinary@^2.9.0` | ✅ |
| Node | `>=20.9.0` | ✅ |

### 추가 설치 필요 (Sprint 1 한정)

```bash
npm i argon2 jose zod
npm i -D @types/argon2
```

- `argon2` — 비밀번호 해싱 (OWASP 권장, bcrypt 대비 GPU 내성 강함)
- `jose` — OAuth id_token 검증 (Google OIDC용 JWKS)
- `zod` — API 입력 검증 (이미 쓸 예정이나 package.json 미등재)

### Next.js 16 Breaking Changes — 이 Sprint에 영향 있음

**이 프로젝트에 이미 적용된 Next.js 16 변경점** (참고용, 혼선 방지):

1. **`middleware.ts` → `proxy.ts`**
   - 현재 파일: `/proxy.ts`
   - export 이름도 `middleware`가 아니라 **`proxy`**
   - Sprint 1에서 인증 로직을 이 파일에 추가해야 함 (아래 §5 참조)

2. **`matcher` 설정**: 현재 `["/((?!api|_next|_vercel|.*\\..*).*)"]` — API 경로 제외됨. API 자체 보호는 route handler에서 직접 세션 검증 필요.

3. **Server Actions**: React 19 + Next.js 16 조합에서 `"use server"` 지시어 기반. 로그인·가입은 Server Action으로 구현.

4. **Cookies API**: `cookies()` from `next/headers`는 **async** (Next.js 15부터 변경). `const c = await cookies()` 형태로 호출.

---

## 2. 인증 시스템 기술 결정

### 2.1 Decision: `next-auth` 채택 X · **기존 `lib/admin-session.ts` 패턴 확장**

**근거**
- 기존 프로젝트에 `lib/admin-session.ts`가 **HMAC-SHA256 서명된 base64url 세션 토큰** 패턴으로 이미 작동 중 (AdminUser용)
- 동일 패턴을 User용 (`lib/user-session.ts`)으로 이식하면:
  - 외부 의존성 0
  - 코드 일관성 유지
  - `next-auth v5` + Next.js 16 호환성 리스크 제거
- OAuth 콜백만 직접 구현하면 끝 (Kakao OAuth2 + Google OIDC)

### 2.2 세션 토큰 구조 (admin-session.ts와 동일)

```
<base64url(JSON payload)>.<base64url(HMAC_SHA256(secret, payload))>

payload = {
  v: 1,                          // version
  sub: userId,                   // User.id
  role: "advertiser"|"agency"|"owner"|"admin",
  exp: <unix_ms>                 // 발급 + 7일
}
```

### 2.3 쿠키 설정

| 쿠키 | 용도 | Options |
|---|---|---|
| `tkad_user_session` | 일반 사용자 세션 | `httpOnly`, `secure` (prod), `sameSite=lax`, `path=/`, `maxAge=7d` |
| `tkad_csrf` | CSRF 토큰 (double submit) | `sameSite=lax`, `path=/`, `maxAge=session` |
| `tkad_oauth_state` | OAuth state 검증 | `httpOnly`, `secure`, `sameSite=lax`, `maxAge=10min` |

### 2.4 인증 경로 (신규 엔드포인트)

```
POST   /api/auth/register              # 이메일 가입
POST   /api/auth/login                 # 이메일 로그인
POST   /api/auth/logout                # 로그아웃
GET    /api/auth/session               # 현재 세션 조회
POST   /api/auth/password/forgot       # 재설정 메일 발송
POST   /api/auth/password/reset        # 토큰 기반 재설정
POST   /api/auth/email/verify          # 이메일 인증
GET    /api/auth/oauth/kakao/start     # Kakao OAuth 시작
GET    /api/auth/oauth/kakao/callback
GET    /api/auth/oauth/google/start    # Google OIDC 시작
GET    /api/auth/oauth/google/callback
```

### 2.5 Kakao OAuth (OAuth 2.0)

```
1. /api/auth/oauth/kakao/start
   → state = randomBytes(32).toString('hex')
   → Set-Cookie: tkad_oauth_state=<state>
   → Redirect: https://kauth.kakao.com/oauth/authorize
       ?response_type=code
       &client_id=<KAKAO_LOGIN_CLIENT_ID>
       &redirect_uri=<APP_URL>/api/auth/oauth/kakao/callback
       &state=<state>
       &scope=account_email,profile_nickname

2. /api/auth/oauth/kakao/callback?code=...&state=...
   → verify state against cookie
   → POST https://kauth.kakao.com/oauth/token (exchange code for access_token)
   → GET  https://kapi.kakao.com/v2/user/me (fetch email, nickname)
   → upsert User + UserOAuthAccount
   → issue session token + set cookie
   → Redirect: /my  (or ?redirect= query)
```

### 2.6 Google OAuth (OIDC)

```
1. /api/auth/oauth/google/start
   → scope=openid email profile
   → endpoint: https://accounts.google.com/o/oauth2/v2/auth

2. callback
   → exchange code at https://oauth2.googleapis.com/token
   → verify id_token signature via JWKS:
       https://www.googleapis.com/oauth2/v3/certs
       (jose 라이브러리 — createRemoteJWKSet + jwtVerify)
   → extract sub, email, email_verified, name from id_token
   → reject if email_verified !== true
   → upsert User + UserOAuthAccount
   → issue session token
```

### 2.7 Role 분기 (proxy.ts에서 처리)

```
/my/*       → role === "advertiser" (또는 admin)
              agency → /partner 리다이렉트
              owner  → /owner 리다이렉트
              no session → /login?redirect=<원본>

/partner/*  → role === "agency" only (Phase 1은 placeholder 페이지)
/owner/*    → role === "owner" only  (Phase 1은 placeholder 페이지)
/admin/*    → 기존 AdminUser 로직 유지 (별도 쿠키)
```

### 2.8 Rate Limit (`lib/rate-limit.ts` 신규)

Sprint 1 범위는 **메모리 기반** (Upstash Redis는 Sprint 2에 도입):
- `/api/auth/login`: IP별 분당 10회
- `/api/auth/register`: IP별 시간당 5회
- `/api/auth/password/forgot`: 이메일별 시간당 3회

구현: `Map<string, { count: number; resetAt: number }>` — 단일 Vercel 인스턴스 기준. Sprint 2에 Redis로 교체.

---

## 3. Prisma 스키마 추가 (prisma/schema.prisma 말미에 append)

> **원칙**: 기존 28개 모델 수정 금지. User·Media 연결은 FK만 추가.
> **명명**: 기존 프로젝트 컨벤션(`@map("snake_case")`) 일치시킴.

```prisma
// =============================================
// Sprint 1: User auth
// =============================================

enum UserRole {
  advertiser
  agency
  owner
  admin
}

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String?   @map("password_hash")     // null if OAuth-only
  name            String
  phone           String?
  company         String?
  locale          String    @default("ko")
  role            UserRole  @default(advertiser)
  emailVerifiedAt DateTime? @map("email_verified_at")
  lastLoginAt     DateTime? @map("last_login_at")
  deletedAt       DateTime? @map("deleted_at")        // soft delete (30d purge)
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  sessions        UserSession[]
  oauthAccounts   UserOAuthAccount[]
  favorites       UserFavoriteMedia[]
  plans           PlannerPlan[]
  emailTokens     UserEmailToken[]

  @@index([email])
  @@map("users")
}

model UserSession {
  id         String   @id @default(cuid())
  userId     String   @map("user_id")
  // 토큰 해시만 저장 (원본은 쿠키에만)
  tokenHash  String   @unique @map("token_hash")
  userAgent  String?  @map("user_agent")
  ip         String?
  expiresAt  DateTime @map("expires_at")
  revokedAt  DateTime? @map("revoked_at")
  createdAt  DateTime @default(now()) @map("created_at")

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("user_sessions")
}

model UserOAuthAccount {
  id            String   @id @default(cuid())
  userId        String   @map("user_id")
  provider      String   // "kakao" | "google"
  providerId    String   @map("provider_id")
  email         String?
  accessToken   String?  @map("access_token") @db.Text
  refreshToken  String?  @map("refresh_token") @db.Text
  expiresAt     DateTime? @map("expires_at")
  createdAt     DateTime @default(now()) @map("created_at")

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerId])
  @@index([userId])
  @@map("user_oauth_accounts")
}

model UserEmailToken {
  id        String    @id @default(cuid())
  userId    String    @map("user_id")
  tokenHash String    @unique @map("token_hash")
  purpose   String    // "verify_email" | "reset_password"
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, purpose])
  @@map("user_email_tokens")
}

model UserFavoriteMedia {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  mediaId   String   @map("media_id")
  createdAt DateTime @default(now()) @map("created_at")

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  media     Media    @relation(fields: [mediaId], references: [id], onDelete: Cascade)

  @@unique([userId, mediaId])
  @@index([mediaId])
  @@map("user_favorite_medias")
}

model PlannerPlan {
  id          String   @id @default(cuid())
  userId      String?  @map("user_id")              // nullable — 비로그인 저장 병합 대응
  name        String
  payloadJson Json     @map("payload_json")
  status      String   @default("draft")            // draft | submitted | archived
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@map("planner_plans")
}

model AuditLog {
  id        String   @id @default(cuid())
  actorId   String?  @map("actor_id")
  actorType String   @map("actor_type")  // "user" | "admin" | "system"
  action    String                        // "auth.login" | "auth.logout" | "user.role_change" ...
  targetId  String?  @map("target_id")
  payload   Json?
  ip        String?
  userAgent String?  @map("user_agent")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([actorId, createdAt])
  @@index([action, createdAt])
  @@map("audit_logs")
}
```

### 3.1 기존 `Media` 모델 수정 (새 relation 추가만)

`Media` 모델의 기존 필드는 건드리지 않고, 아래 한 줄만 body 마지막에 추가:

```prisma
model Media {
  // ... 기존 필드 유지 ...

  favorites   UserFavoriteMedia[]     // <-- 이 줄만 추가
}
```

### 3.2 마이그레이션 명령 (실행 순서)

```bash
# 1. 개발 DB에 적용 (기존 db:push 스크립트 사용)
npm run db:push

# 2. Prisma Client 재생성
npx prisma generate

# 3. 시드는 Sprint 1에선 선택적 (테스트용 1명)
npx tsx prisma/seed.ts
```

> **주의**: Prisma 7 Migration은 `prisma migrate` 명령이 아닌 `db:push` 기반 흐름을 기존 프로젝트가 채택 중 (package.json `db:push` 스크립트). 동일 흐름 유지.

---

## 4. 구현 순서 (Step by step)

### Step 1: 의존성 설치 + Prisma 스키마 반영

```bash
npm i argon2 jose zod
npm i -D @types/argon2
# prisma/schema.prisma에 §3 블록 append
npm run db:push
npx prisma generate
```

**검증**: `npx prisma studio` 열어서 `users`, `user_sessions`, `user_oauth_accounts`, `user_email_tokens`, `user_favorite_medias`, `planner_plans`, `audit_logs` 테이블 7개 생성 확인.

---

### Step 2: 환경변수 추가 (`.env.local` + Vercel)

`.env.production.example`에 다음 추가:

```bash
# === Sprint 1: User Auth ===
USER_SESSION_SECRET=                    # openssl rand -base64 48
APP_URL=https://thinkad.kr              # OAuth redirect base
NEXT_PUBLIC_APP_URL=https://thinkad.kr

# Kakao OAuth
KAKAO_LOGIN_CLIENT_ID=
KAKAO_LOGIN_CLIENT_SECRET=
KAKAO_LOGIN_REDIRECT_URI=${APP_URL}/api/auth/oauth/kakao/callback

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=${APP_URL}/api/auth/oauth/google/callback

# Email (Resend — 이미 있으면 skip)
RESEND_API_KEY=
RESEND_FROM_EMAIL=no-reply@thinkad.kr
```

**Vercel 세팅**: Preview/Production 환경별로 각각 등록. Preview는 `APP_URL`이 `https://*.vercel.app` 동적이므로, OAuth 콜백 URL은 고정된 prod URL로 통일 (staging 별도 OAuth 앱 분리).

---

### Step 3: `lib/user-session.ts` 작성 (admin-session.ts 참조)

**파일**: `/lib/user-session.ts`

핵심 함수 5개:

```typescript
export const USER_SESSION_COOKIE = "tkad_user_session";

// 1. 토큰 생성
export function createUserSessionToken(userId: string, role: UserRole): string

// 2. 토큰 검증 (HMAC + 만료)
export function verifyUserSessionToken(token: string | undefined):
  | { ok: true; userId: string; role: UserRole }
  | { ok: false; code: "missing" | "malformed" | "bad_signature" | "expired" | "invalid" }

// 3. 쿠키 옵션
export function userSessionCookieOptions(): CookieOptions

// 4. 서버 컴포넌트에서 세션 조회 (async cookies)
export async function getCurrentUser(): Promise<{
  id: string; email: string; name: string; role: UserRole;
} | null>

// 5. 세션 토큰 해시 (DB UserSession.tokenHash 저장용)
export function hashSessionToken(token: string): string  // SHA-256
```

**시그니처 구현 원칙** (admin-session.ts와 동일):
- payload: `{ v: 1, sub, role, exp }` → JSON → base64url → `.` → HMAC-SHA256 signature (base64url)
- `timingSafeEqual`로 서명 검증
- secret: `USER_SESSION_SECRET` env · dev fallback 있음
- `verifyUserSessionToken`은 DB 조회하지 않음 (성능)
- `getCurrentUser`는 DB `users` 테이블 한 번 조회 (role, name 등 최신 상태)

---

### Step 4: 비밀번호 해싱 + 공통 유틸

**파일**: `/lib/password.ts`

```typescript
import argon2 from "argon2";

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 19456,    // 19 MB (OWASP 2024)
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try { return await argon2.verify(hash, plain); }
  catch { return false; }
}
```

**파일**: `/lib/rate-limit.ts`

```typescript
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}
```

**파일**: `/lib/audit-log.ts`

```typescript
export async function writeAuditLog(params: {
  actorId: string | null;
  actorType: "user" | "admin" | "system";
  action: string;
  targetId?: string;
  payload?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}): Promise<void>
```

---

### Step 5: Credentials 로그인·가입 API

**파일**: `/app/api/auth/register/route.ts`

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";
import { createUserSessionToken, hashSessionToken, userSessionCookieOptions, USER_SESSION_COOKIE } from "@/lib/user-session";
import { sendVerificationEmail } from "@/lib/email-verification";
import { randomBytes, createHash } from "crypto";

const Body = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(40),
  locale: z.enum(["ko", "en", "zh", "ja"]).default("ko"),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(`register:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: { code: "RATE_LIMITED" } }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: "INVALID_INPUT" } }, { status: 400 });
  }

  const { email, password, name, locale } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ ok: false, error: { code: "EMAIL_IN_USE" } }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, locale, role: "advertiser" },
  });

  // 이메일 인증 토큰
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  await prisma.userEmailToken.create({
    data: {
      userId: user.id,
      tokenHash,
      purpose: "verify_email",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  await sendVerificationEmail(email, rawToken, locale);

  // 세션 발급 (이메일 미인증 상태에서도 로그인은 허용, 단 결제·계약 시 차단)
  const sessionToken = createUserSessionToken(user.id, user.role);
  await prisma.userSession.create({
    data: {
      userId: user.id,
      tokenHash: hashSessionToken(sessionToken),
      userAgent: req.headers.get("user-agent") ?? undefined,
      ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const res = NextResponse.json({ ok: true, data: { id: user.id, email, name } });
  res.cookies.set(USER_SESSION_COOKIE, sessionToken, userSessionCookieOptions());
  return res;
}
```

**파일**: `/app/api/auth/login/route.ts`

구조 동일하되 차이:
- `prisma.user.findUnique({ where: { email } })` → 없으면 `INVALID_CREDENTIALS`
- `verifyPassword(user.passwordHash, password)` → false면 `INVALID_CREDENTIALS`
- `soft delete (deletedAt)` 체크 → `ACCOUNT_DELETED`
- 성공: `UserSession` 생성 + 쿠키 + `writeAuditLog({ action: "auth.login", ... })`

**파일**: `/app/api/auth/logout/route.ts`

```typescript
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { USER_SESSION_COOKIE, hashSessionToken } from "@/lib/user-session";

export async function POST() {
  const c = await cookies();
  const token = c.get(USER_SESSION_COOKIE)?.value;
  if (token) {
    await prisma.userSession.updateMany({
      where: { tokenHash: hashSessionToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(USER_SESSION_COOKIE);
  return res;
}
```

**파일**: `/app/api/auth/session/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-session";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ ok: true, data: user });
}
```

---

### Step 6: Kakao OAuth

**파일**: `/app/api/auth/oauth/kakao/start/route.ts`

```typescript
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function GET(req: Request) {
  const state = randomBytes(32).toString("hex");
  const url = new URL(req.url);
  const redirect = url.searchParams.get("redirect") ?? "/my";

  const authUrl = new URL("https://kauth.kakao.com/oauth/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", process.env.KAKAO_LOGIN_CLIENT_ID!);
  authUrl.searchParams.set("redirect_uri", process.env.KAKAO_LOGIN_REDIRECT_URI!);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", "account_email,profile_nickname");

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("tkad_oauth_state", `${state}|${redirect}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
```

**파일**: `/app/api/auth/oauth/kakao/callback/route.ts`

주요 흐름:
1. `searchParams.state` vs `cookies.tkad_oauth_state` 비교 → 불일치면 400
2. `POST https://kauth.kakao.com/oauth/token` (code + client_id + client_secret)
3. `GET https://kapi.kakao.com/v2/user/me` with `Authorization: Bearer <access_token>`
4. `kakao_account.email` 필수 (없으면 오류 화면 리다이렉트)
5. `prisma.user.upsert({ where: { email }, update: { lastLoginAt }, create: { ..., role: "advertiser", emailVerifiedAt: new Date() } })`
6. `prisma.userOAuthAccount.upsert({ where: { provider_providerId: { provider: "kakao", providerId: kakaoId } }, ... })`
7. `UserSession` 생성 + 쿠키 + `writeAuditLog({ action: "auth.oauth.kakao" })`
8. `NextResponse.redirect(new URL(redirect, APP_URL))`

---

### Step 7: Google OIDC

`/app/api/auth/oauth/google/start` — Kakao와 동일한 state 패턴, scope=`openid email profile`

`/app/api/auth/oauth/google/callback`:
- 토큰 교환 후 `id_token` JWT 검증:
  ```typescript
  import { createRemoteJWKSet, jwtVerify } from "jose";
  const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
  });
  ```
- `payload.email_verified !== true`면 거부
- upsert 패턴은 Kakao와 동일

---

### Step 8: `proxy.ts`에 인증 레이어 통합

**현재** (기존):
```typescript
// /proxy.ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
const intlMiddleware = createMiddleware(routing);

export function proxy(request: NextRequest) {
  return intlMiddleware(request);
}
```

**수정 후**:
```typescript
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { verifyUserSessionToken, USER_SESSION_COOKIE } from "./lib/user-session";

const intlMiddleware = createMiddleware(routing);

const PROTECTED_PREFIXES = ["/my", "/partner", "/owner"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // locale prefix를 벗긴 경로 추출 (ko|en|zh|ja)
  const bare = pathname.replace(/^\/(ko|en|zh|ja)(?=\/|$)/, "") || "/";
  const needsAuth = PROTECTED_PREFIXES.some(p => bare === p || bare.startsWith(`${p}/`));

  if (needsAuth) {
    const token = request.cookies.get(USER_SESSION_COOKIE)?.value;
    const session = verifyUserSessionToken(token);

    if (!session.ok) {
      const login = new URL("/login", request.url);
      login.searchParams.set("redirect", pathname);
      return NextResponse.redirect(login);
    }

    // Role 분기
    if (bare.startsWith("/my") && session.role !== "advertiser" && session.role !== "admin") {
      const target = session.role === "agency" ? "/partner" : "/owner";
      return NextResponse.redirect(new URL(target, request.url));
    }
    if (bare.startsWith("/partner") && session.role !== "agency" && session.role !== "admin") {
      return NextResponse.redirect(new URL("/my", request.url));
    }
    if (bare.startsWith("/owner") && session.role !== "owner" && session.role !== "admin") {
      return NextResponse.redirect(new URL("/my", request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

**주의**: `proxy.ts`는 Edge Runtime에서 실행됨 — `argon2`·`pg`·`prisma` 등 Node 전용 모듈 import 금지. `verifyUserSessionToken`은 `crypto` (Edge 지원) 만 사용하므로 OK.

---

### Step 9: 로그인/가입 UI + `/my` 대시보드 셸

**파일 구조**:

```
app/[locale]/
├── (auth)/              # 그룹 라우트, layout 분리
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   ├── reset-password/[token]/page.tsx
│   └── verify-email/[token]/page.tsx
└── my/
    ├── layout.tsx       # 좌측 세로 네비 (모바일 드로어)
    ├── page.tsx         # 대시보드 (요약 카드 3종)
    ├── plans/page.tsx   # placeholder
    ├── quotes/page.tsx  # placeholder
    ├── campaigns/page.tsx # placeholder
    ├── favorites/page.tsx
    └── settings/page.tsx
```

**`app/[locale]/my/layout.tsx`** — 핵심 구조:

```tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/user-session";
import { MyNav } from "@/components/my/my-nav";

export default async function MyLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/my");
  // role 분기는 proxy.ts에서 이미 처리됨

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:block w-[200px] border-r">
        <MyNav user={user} />
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

**`app/[locale]/my/page.tsx`** — 대시보드 요약:

```tsx
import { getCurrentUser } from "@/lib/user-session";
import { prisma } from "@/lib/prisma";
import { DashboardCards } from "@/components/my/dashboard-cards";

export default async function MyDashboardPage() {
  const user = (await getCurrentUser())!;

  const [plansCount, favoritesCount, activeQuotesCount] = await Promise.all([
    prisma.plannerPlan.count({ where: { userId: user.id, status: { not: "archived" } } }),
    prisma.userFavoriteMedia.count({ where: { userId: user.id } }),
    prisma.ooHQuote.count({ where: { /* Phase 1 placeholder */ id: "__none__" } }),
  ]);

  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">안녕하세요, {user.name}님</h1>
      <DashboardCards
        activeCampaigns={activeQuotesCount}
        savedPlans={plansCount}
        unreadNotifications={0}
      />
    </>
  );
}
```

**`/app/[locale]/(auth)/login/page.tsx`** — 클라이언트 폼 + Server Action:

```tsx
"use client";
// 이메일·비밀번호 폼 + "카카오로 로그인" (<a href="/api/auth/oauth/kakao/start">) + "Google로 로그인"
// fetch("/api/auth/login", { method: "POST", body: JSON.stringify(...) })
// 성공 시 router.push(redirectParam ?? "/my")
```

---

### Step 10: localStorage ↔ 서버 동기화 훅 (F1.4 핵심)

**파일**: `/lib/user-sync.ts` (client-only)

```typescript
const LS_KEY = "tkad-planner-plan-v2";

export async function syncLocalPlansToServer(): Promise<void> {
  const raw = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
  if (!raw) return;
  try {
    const plan = JSON.parse(raw);
    const res = await fetch("/api/my/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: plan.name ?? "임시 플랜", payloadJson: plan, status: "draft" }),
    });
    if (res.ok) localStorage.removeItem(LS_KEY);
  } catch { /* no-op */ }
}
```

**호출 지점**: `/app/[locale]/(auth)/login/page.tsx` 및 OAuth 콜백 후 landing 페이지의 `useEffect`에서 `syncLocalPlansToServer()` 1회 실행.

---

## 5. 개발 환경 세팅

### 5.1 로컬 부트스트랩 (최초 1회)

```bash
# Node 20.9+ 필수 (.nvmrc 확인)
nvm use

# 의존성
npm install

# Prisma Client 생성 (postinstall 훅에 있지만 명시적으로)
npx prisma generate

# 로컬 Postgres (Docker 권장)
docker run --name thinkad-pg -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=thinkad \
  -p 5432:5432 -d postgres:16

# .env.local 작성 (아래 §5.2)

# 스키마 반영
npm run db:push

# 시드 (선택)
npx tsx prisma/seed.ts

# 개발 서버
npm run dev
# → http://localhost:3000/ko
```

### 5.2 `.env.local` 최소 세트 (Sprint 1 범위)

```bash
# DB
DATABASE_URL=postgresql://postgres:dev@localhost:5432/thinkad?schema=public
DIRECT_URL=postgresql://postgres:dev@localhost:5432/thinkad?schema=public

# App
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# User Auth (Sprint 1 신규)
USER_SESSION_SECRET=dev-user-session-secret-change-me-in-prod
ADMIN_SESSION_SECRET=dev-admin-session-secret

# Kakao OAuth (Pre-sprint에 발급)
KAKAO_LOGIN_CLIENT_ID=
KAKAO_LOGIN_CLIENT_SECRET=
KAKAO_LOGIN_REDIRECT_URI=http://localhost:3000/api/auth/oauth/kakao/callback

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/oauth/google/callback

# Email (Sprint 1에선 실제 발송 없이 console.log 폴백 가능)
RESEND_API_KEY=
RESEND_FROM_EMAIL=no-reply@thinkad.kr
```

**`lib/email-verification.ts` 구현 팁**: `RESEND_API_KEY`가 비어있으면 `console.log(subject, to, body)`로 폴백해 로컬 개발 지연 제거.

### 5.3 Vercel 배포 설정

**Project Settings → Environment Variables** (Production / Preview / Development 각각 등록):

| 변수 | Production | Preview | Development |
|---|---|---|---|
| `DATABASE_URL` | Neon/Supabase prod URL | Neon branch URL | 로컬 |
| `USER_SESSION_SECRET` | `openssl rand -base64 48` 생성 값 | 별도 값 | `.env.local` |
| `KAKAO_LOGIN_*` | prod 앱 | staging 앱 | dev 앱 |
| `GOOGLE_OAUTH_*` | prod 앱 | staging 앱 | dev 앱 |
| `RESEND_API_KEY` | prod key | sandbox key | (빈값) |

**Build Command** (이미 세팅됨): `prisma generate && next build` (package.json `vercel-build`)

**Preview Deploy 제약**: OAuth redirect URI는 `*.vercel.app` 와일드카드를 허용 안 함. **Preview는 staging 고정 도메인** (예: `staging.thinkad.kr`) 을 Vercel Domains에 할당하여 사용.

### 5.4 로컬에서 OAuth 테스트

Kakao/Google Developer Console에서 **redirect URI에 `http://localhost:3000/api/auth/oauth/{provider}/callback` 등록**. 로컬 HTTPS 불필요 (`sameSite=lax` + `secure=false` dev 모드).

### 5.5 Node 런타임 vs Edge Runtime 주의

| 파일 | 런타임 | 이유 |
|---|---|---|
| `proxy.ts` | **Edge** (강제) | matcher 경로에 실행. `crypto` (Web Crypto) OK. Prisma·argon2 금지 |
| `/api/auth/*/route.ts` | **Node** (기본) | Prisma + argon2 사용. `export const runtime = "nodejs"` 명시 권장 |
| 서버 컴포넌트 (`app/[locale]/my/*.tsx`) | Node | Prisma 직접 호출 |

### 5.6 Prisma Client Singleton

**파일**: `/lib/prisma.ts` (이미 있을 가능성 높음, 없으면 생성)

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### 5.7 Sprint 1 완료 기준 (Done의 정의)

구현이 모두 끝나면 다음이 동작해야 함:

- [ ] `npm run db:push` 성공 · 7개 신규 테이블 생성
- [ ] `POST /api/auth/register` → 201 + 세션 쿠키 · 이메일 인증 토큰 레코드 생성
- [ ] `POST /api/auth/login` → 200 + 세션 쿠키 · AuditLog 기록
- [ ] `POST /api/auth/logout` → 쿠키 삭제 + UserSession revokedAt 세팅
- [ ] `GET /api/auth/session` → 로그인 상태의 user 정보 반환
- [ ] `GET /api/auth/oauth/kakao/start` → Kakao 인증 페이지로 302
- [ ] Kakao 로그인 완료 시 `/my`로 리다이렉트 + DB에 `users` + `user_oauth_accounts` 생성
- [ ] Google 로그인 동일 동작
- [ ] 비로그인으로 `/ko/my` 접근 시 `/ko/login?redirect=/ko/my`로 302 (proxy.ts)
- [ ] `role=agency` 사용자가 `/ko/my` 접근 시 `/ko/partner`로 302
- [ ] `/ko/my` 대시보드가 이름 + 요약 카드 3종 렌더
- [ ] 비로그인 상태의 `tkad-planner-plan-v2` localStorage → 로그인 직후 `planner_plans` 테이블로 자동 이관
- [ ] `npm run build` 성공 (타입 에러 0)
- [ ] Vercel Preview 배포 성공

### 5.8 테스트 커맨드

```bash
# 타입 체크
npx tsc --noEmit

# 린트
npm run lint

# 로컬 수동 smoke test 스크립트 (선택)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword123","name":"테스트"}'

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c /tmp/cookies.txt \
  -d '{"email":"test@example.com","password":"testpassword123"}'

curl http://localhost:3000/api/auth/session -b /tmp/cookies.txt
```

---

## 6. 파일 체크리스트 (착수 시 생성/수정할 파일 전체)

**신규 생성**
```
lib/user-session.ts
lib/password.ts
lib/rate-limit.ts
lib/audit-log.ts
lib/email-verification.ts
lib/user-sync.ts
lib/prisma.ts                         (없으면)

app/api/auth/register/route.ts
app/api/auth/login/route.ts
app/api/auth/logout/route.ts
app/api/auth/session/route.ts
app/api/auth/password/forgot/route.ts
app/api/auth/password/reset/route.ts
app/api/auth/email/verify/route.ts
app/api/auth/oauth/kakao/start/route.ts
app/api/auth/oauth/kakao/callback/route.ts
app/api/auth/oauth/google/start/route.ts
app/api/auth/oauth/google/callback/route.ts

app/[locale]/(auth)/login/page.tsx
app/[locale]/(auth)/register/page.tsx
app/[locale]/(auth)/forgot-password/page.tsx
app/[locale]/(auth)/reset-password/[token]/page.tsx
app/[locale]/(auth)/verify-email/[token]/page.tsx
app/[locale]/my/layout.tsx
app/[locale]/my/page.tsx
app/[locale]/my/plans/page.tsx
app/[locale]/my/quotes/page.tsx
app/[locale]/my/campaigns/page.tsx
app/[locale]/my/favorites/page.tsx
app/[locale]/my/settings/page.tsx

components/my/my-nav.tsx
components/my/dashboard-cards.tsx
components/auth/login-form.tsx
components/auth/register-form.tsx
```

**수정**
```
prisma/schema.prisma                  (§3 블록 append + Media 한 줄 추가)
proxy.ts                              (§4 Step 8 전체 교체)
.env.production.example               (§4 Step 2 신규 변수 append)
package.json                          (argon2, jose, zod 추가)
```

---

## 7. 이 Sprint에서 **하지 않는** 것 (Scope Lock)

- 플래너 위자드 UI 구현 (Sprint 4)
- 자동 제안서 PDF 생성 UI (Sprint 5)
- 지도 기반 매체 검색 (Sprint 2)
- 알림 시스템 · Web Push (Phase 2)
- 대행사/오너 포털 실제 기능 (Phase 3) — **placeholder 페이지만**
- 챗봇 UI (Phase 3)
- PostGIS 이관 (Phase 3)
- next-auth 도입 (채택 안 함)
- Upstash Redis (Sprint 2에 도입, Sprint 1은 in-memory rate-limit)





