# Sprint 1 Step 1-3 — 실제 구현 코드

## Step 1: 의존성 설치

```bash
npm i argon2@^0.41.1 jose@^5.9.6 zod@^3.24.1
npm i -D @types/argon2@^0.15.1
```

설치 후 `package.json` `dependencies`에 다음이 추가됨:

```json
{
  "dependencies": {
    "argon2": "^0.41.1",
    "jose": "^5.9.6",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/argon2": "^0.15.1"
  }
}
```

---

## Step 2: Prisma 스키마 추가

### 파일: `prisma/schema.prisma` (말미에 append)

```prisma
// ============================================================
// Sprint 1: User authentication
// ============================================================

enum UserRole {
  advertiser
  agency
  owner
  admin
}

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String?   @map("password_hash")
  name            String
  phone           String?
  company         String?
  locale          String    @default("ko")
  role            UserRole  @default(advertiser)
  emailVerifiedAt DateTime? @map("email_verified_at")
  lastLoginAt     DateTime? @map("last_login_at")
  deletedAt       DateTime? @map("deleted_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  sessions        UserSession[]
  oauthAccounts   UserOAuthAccount[]
  emailTokens     UserEmailToken[]

  @@index([email])
  @@map("users")
}

model UserSession {
  id        String    @id @default(cuid())
  userId    String    @map("user_id")
  tokenHash String    @unique @map("token_hash")
  userAgent String?   @map("user_agent")
  ip        String?
  expiresAt DateTime  @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("user_sessions")
}

model UserOAuthAccount {
  id           String    @id @default(cuid())
  userId       String    @map("user_id")
  provider     String
  providerId   String    @map("provider_id")
  email        String?
  accessToken  String?   @map("access_token") @db.Text
  refreshToken String?   @map("refresh_token") @db.Text
  expiresAt    DateTime? @map("expires_at")
  createdAt    DateTime  @default(now()) @map("created_at")

  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerId])
  @@index([userId])
  @@map("user_oauth_accounts")
}

model UserEmailToken {
  id        String    @id @default(cuid())
  userId    String    @map("user_id")
  tokenHash String    @unique @map("token_hash")
  purpose   String
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, purpose])
  @@map("user_email_tokens")
}
```

### 적용 명령

```bash
npm run db:push
npx prisma generate
```

---

## Step 3: `lib/user-session.ts` 전체 코드

### 파일: `lib/user-session.ts`

```typescript
import { createHmac, createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export const USER_SESSION_COOKIE = "tkad_user_session";

const MAX_AGE_SEC = 60 * 60 * 24 * 7;

export function isUserAuthDebugEnabled(): boolean {
  return process.env.USER_AUTH_DEBUG === "1";
}

function sessionSecret(): string | null {
  const s = process.env.USER_SESSION_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV !== "production") {
    return "dev-user-session-secret-set-user-session-secret-in-prod";
  }
  return null;
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

type SessionPayload = {
  v: 1;
  sub: string;
  role: UserRole;
  exp: number;
};

export function createUserSessionToken(
  userId: string,
  role: UserRole,
): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  const payload: SessionPayload = { v: 1, sub: userId, role, exp };
  const json = JSON.stringify(payload);
  const sig = signPayload(json, secret);
  const enc = Buffer.from(json, "utf8").toString("base64url");
  return `${enc}.${sig}`;
}

export type UserSessionVerifyCode =
  | "ok"
  | "missing_secret"
  | "missing_token"
  | "malformed_token"
  | "bad_payload_encoding"
  | "bad_signature"
  | "invalid_payload_json"
  | "invalid_payload_shape"
  | "expired";

export type UserSessionVerifyResult =
  | { ok: true; code: "ok"; userId: string; role: UserRole; exp: number }
  | { ok: false; code: Exclude<UserSessionVerifyCode, "ok"> };

export function verifyUserSessionDetails(
  token: string | undefined,
): UserSessionVerifyResult {
  const secret = sessionSecret();
  if (!secret) return { ok: false, code: "missing_secret" };
  if (token == null || token === "") return { ok: false, code: "missing_token" };
  if (!token.includes(".")) return { ok: false, code: "malformed_token" };

  const dot = token.indexOf(".");
  const enc = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!enc || !sig) return { ok: false, code: "malformed_token" };

  let payload: string;
  try {
    payload = Buffer.from(enc, "base64url").toString("utf8");
  } catch {
    return { ok: false, code: "bad_payload_encoding" };
  }

  const expected = signPayload(payload, secret);
  try {
    if (expected.length !== sig.length) return { ok: false, code: "bad_signature" };
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
      return { ok: false, code: "bad_signature" };
    }
  } catch {
    return { ok: false, code: "bad_signature" };
  }

  let data: SessionPayload;
  try {
    data = JSON.parse(payload) as SessionPayload;
  } catch {
    return { ok: false, code: "invalid_payload_json" };
  }

  if (
    data.v !== 1 ||
    typeof data.sub !== "string" ||
    typeof data.role !== "string" ||
    typeof data.exp !== "number"
  ) {
    return { ok: false, code: "invalid_payload_shape" };
  }
  if (Date.now() > data.exp) return { ok: false, code: "expired" };

  return {
    ok: true,
    code: "ok",
    userId: data.sub,
    role: data.role as UserRole,
    exp: data.exp,
  };
}

export function verifyUserSessionToken(token: string | undefined): boolean {
  return verifyUserSessionDetails(token).ok;
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function userSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  locale: string;
  emailVerifiedAt: Date | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const c = await cookies();
  const token = c.get(USER_SESSION_COOKIE)?.value;
  const result = verifyUserSessionDetails(token);
  if (!result.ok) return null;

  const user = await prisma.user.findFirst({
    where: { id: result.userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      locale: true,
      emailVerifiedAt: true,
    },
  });
  return user;
}

export async function getCurrentUserId(): Promise<string | null> {
  const c = await cookies();
  const token = c.get(USER_SESSION_COOKIE)?.value;
  const result = verifyUserSessionDetails(token);
  return result.ok ? result.userId : null;
}

export async function createSessionRecord(params: {
  userId: string;
  token: string;
  userAgent?: string;
  ip?: string;
}): Promise<void> {
  await prisma.userSession.create({
    data: {
      userId: params.userId,
      tokenHash: hashSessionToken(params.token),
      userAgent: params.userAgent,
      ip: params.ip,
      expiresAt: new Date(Date.now() + MAX_AGE_SEC * 1000),
    },
  });
}

export async function revokeSessionByToken(token: string): Promise<void> {
  await prisma.userSession.updateMany({
    where: { tokenHash: hashSessionToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.userSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
```

---

## Step 4: 환경변수

### 파일: `.env.example` (신규 또는 기존에 append)

```bash
# === Database ===
DATABASE_URL=postgresql://postgres:dev@localhost:5432/thinkad?schema=public
DATABASE_POOL_MAX=15

# === App ===
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# === Admin session (기존) ===
ADMIN_SESSION_SECRET=dev-admin-session-secret-change-in-prod
ADMIN_USERNAME=admin
ADMIN_PASSWORD=thinkad2024

# === User session (신규 - Sprint 1) ===
# 생성: openssl rand -base64 48
USER_SESSION_SECRET=dev-user-session-secret-change-in-prod
USER_AUTH_DEBUG=0

# === Kakao OAuth (신규) ===
KAKAO_LOGIN_CLIENT_ID=
KAKAO_LOGIN_CLIENT_SECRET=
KAKAO_LOGIN_REDIRECT_URI=http://localhost:3000/api/auth/oauth/kakao/callback

# === Google OAuth (신규) ===
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/oauth/google/callback

# === Email (Resend) ===
RESEND_API_KEY=
RESEND_FROM_EMAIL=no-reply@thinkad.kr
```

### `.env.production.example`에 추가할 변수만 (기존 파일 보존)

```bash
# Sprint 1
USER_SESSION_SECRET=
USER_AUTH_DEBUG=0

KAKAO_LOGIN_CLIENT_ID=
KAKAO_LOGIN_CLIENT_SECRET=
KAKAO_LOGIN_REDIRECT_URI=https://thinkad.kr/api/auth/oauth/kakao/callback

GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=https://thinkad.kr/api/auth/oauth/google/callback
```

### 로컬 실행 순서

```bash
# 1. 의존성
npm i argon2@^0.41.1 jose@^5.9.6 zod@^3.24.1
npm i -D @types/argon2@^0.15.1

# 2. 환경변수
cp .env.example .env.local
# USER_SESSION_SECRET 값 생성 후 .env.local에 반영
openssl rand -base64 48

# 3. Prisma
npm run db:push
npx prisma generate

# 4. 타입 체크
npx tsc --noEmit

# 5. 개발 서버
npm run dev
```

### 검증 (Prisma Studio)

```bash
npx prisma studio
```

다음 4개 테이블 확인:
- `users`
- `user_sessions`
- `user_oauth_accounts`
- `user_email_tokens`

### 검증 (Node REPL 스크립트)

```bash
cat > /tmp/test-session.mjs <<'EOF'
import {
  createUserSessionToken,
  verifyUserSessionDetails,
  hashSessionToken,
} from "./lib/user-session.ts";

process.env.USER_SESSION_SECRET = "test-secret-for-repl";

const token = createUserSessionToken("user_abc", "advertiser");
console.log("token:", token);

const result = verifyUserSessionDetails(token);
console.log("verify:", result);

console.log("hash:", hashSessionToken(token));
EOF

npx tsx /tmp/test-session.mjs
```

예상 출력:
```
token: eyJ2IjoxLCJzdWIiOiJ1c2VyX2FiYyIsInJvbGUiOiJhZHZlcnRpc2VyIiwiZXhwIjoxNzY...
verify: { ok: true, code: 'ok', userId: 'user_abc', role: 'advertiser', exp: 1767... }
hash: a1b2c3...
```


