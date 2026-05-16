# 사용자 계정 시스템 — 단계별 도입 플랜

> 작업 ID: `[NEW-01]` · 작성: 2026-05-16
> 이슈 컨텍스트: Phase 1 말미 추가 필수 — `/ko/dashboard`, 찜하기, AI 플래너 저장 등이 사용자 계정에 의존.

## 0. 결론 한 줄

이미 자체 인증(`User` + bcrypt + `tkad_user_session` httpOnly 쿠키 + `UserSession` 테이블)이 잘 깔려 있어서, **NextAuth 통째 도입 대신 그 위에 소셜 OAuth만 얹는다.** 모든 새 OAuth 로그인은 동일한 `User` 행 + 동일한 `tkad_user_session` 쿠키로 수렴 → 기존 `/api/auth/session`, `getCurrentUser()`, `MediaFavoriteButton` 등 그대로 호환.

## 1. 현행 인증 구조 (그대로 유지)

| 구성요소 | 위치 |
|---|---|
| 광고주/매체사 세션 쿠키 | `tkad_user_session` (`lib/user-session.ts`) — HMAC + `USER_SESSION_SECRET` |
| 세션 검증 헬퍼 | `getCurrentUser()`, `verifyUserSessionDetails()` |
| 비밀번호 해시 | bcryptjs 12 라운드 (`lib/password.ts`) |
| Prisma User | `User`, `UserSession`, `UserFavoriteMedia` |
| Role enum | `AppUserRole = advertiser \| agency \| owner \| admin` — **`owner` ↔ `MEDIA_OWNER`** 매핑 유지 |
| 어드민 인증 | 완전 별도 (`tkad_admin_session` + env-credential). **건드리지 않음.** |
| 로그인 API | `/api/auth/{login,register,logout,session}` |
| 로그인 페이지 | `/[locale]/(auth)/{login,register}` |
| 헤더 메뉴 | `components/header-user-menu.tsx` → `/api/auth/session` polling |

## 2. 필요 기능 vs 현재 상태

| 요구 사항 | 상태 |
|---|---|
| 카카오 로그인 | **없음 → 추가** |
| 네이버 로그인 | **없음 → 추가** |
| 이메일/비밀번호 | 있음 (그대로) |
| 회원 유형 선택 (ADVERTISER / MEDIA_OWNER) | 부분 — register 페이지는 `CommunityMemberRole`(ADVERTISER/MEDIA/AGENCY/FREELANCER) 기준. `AppUserRole.owner` 로 자동 매핑됨. UI 라벨만 통일 필요 |
| User 프로필 (`id, email, name, phone, company, role, createdAt`) | 있음 (전부 존재) |
| 프로필 편집 페이지 | **없음 → /account/profile 신설** |
| 로그인 상태 헤더 + 드롭다운 | 일부 — 현재 단일 링크. **드롭다운으로 확장** |
| 비로그인 찜하기 localStorage 임시 저장 + 로그인 시 이관 | **없음 → 추가** |
| 플래너 저장 시 로그인 유도 모달 | 보류 (Phase 2 — 별도 PR) |
| 대시보드 미로그인 리다이렉트 | 있음 (`/my`, `/dashboard` 둘 다 client redirect) |
| 인증 페이지 | 있음. `/signup` 별칭만 추가 |

## 3. 이번 PR(`[NEW-01] Phase A`) 범위

다음 항목만 한 PR에 묶음 — 모두 기존 시스템에 **추가만** 하며 파괴적 변경 없음:

1. **Prisma 스키마 추가** — `UserOAuthAccount` 테이블 (provider/providerAccountId/userId). User 관계 1줄만 추가. 기존 컬럼·인덱스 변경 0.
2. **OAuth 인프라** — `lib/oauth/`
   - 상태 쿠키 서명/검증
   - 카카오/네이버 provider config (envvar 기반)
   - 토큰 교환 + userInfo 조회 + User 행 link/create + 기존 `tkad_user_session` 발급
3. **신규 API**
   - `GET  /api/auth/oauth/[provider]/start` — state 발급 + provider authorize로 302
   - `GET  /api/auth/oauth/[provider]/callback` — state 검증 + 토큰 교환 + 로그인 처리
   - `GET  /api/auth/providers` — 활성 provider 목록 (UI에서 버튼 노출 제어)
   - `GET  /api/auth/profile` / `PATCH /api/auth/profile` — 프로필 편집
   - `POST /api/my/favorites/sync` — guest localStorage → DB 일괄 이관
4. **신규 페이지**
   - `/[locale]/account/profile` — 이름/전화/회사/지역/locale 편집
   - `/[locale]/signup` — `/register` 와 동일 UI (이슈에서 요청한 경로 명칭)
5. **컴포넌트**
   - `<AuthSocialButtons />` — 카카오/네이버 버튼 (provider 활성 여부 확인 후 노출)
   - `<GuestFavoritesSync />` — 로그인 직후 localStorage 큐를 DB로 sync (헤더 등에 무음 마운트)
6. **수정**
   - `login` / `register` 페이지에 social 버튼 + signup 페이지 안내
   - `HeaderUserMenu` — 로그인 시 드롭다운(내 대시보드 / 찜한 매체 / 문의 내역 / 프로필 / 로그아웃)
   - `MediaFavoriteButton` — 비로그인 시 localStorage 큐에 저장 + 토스트 + (현재처럼) 로그인 페이지 안내 옵션

## 4. 다음 PR(`Phase B`)에서 다룰 것

- 플래너 저장 시 로그인 유도 모달 + 비로그인 → guest 저장 후 로그인 후 이관
- `/dashboard` 광고주/매체사 분기 UI (현재는 광고주 위주)
- 이메일 검증 메일 발송 (`emailVerifiedAt`)
- 자체 인증 → NextAuth v5 적용 검토 (필요 시. 현재는 미정)
- 비밀번호 찾기/재설정 플로우
- 매체사 매체 등록 신청 페이지

## 5. 필요한 환경 변수

> Vercel Dashboard → Project → Settings → Environment Variables 에 추가

| 변수 | 설명 | 필수? |
|---|---|---|
| `USER_SESSION_SECRET` | 기존. 운영에서 반드시 설정. | ✅ |
| `KAKAO_OAUTH_CLIENT_ID` | 카카오 디벨로퍼스 → 앱 → REST API 키 | OAuth 사용 시 ✅ |
| `KAKAO_OAUTH_CLIENT_SECRET` | 카카오 디벨로퍼스 → 보안 → Client Secret (선택, 발급한 경우만) | 선택 |
| `NAVER_OAUTH_CLIENT_ID` | 네이버 개발자 센터 → 애플리케이션 → Client ID | OAuth 사용 시 ✅ |
| `NAVER_OAUTH_CLIENT_SECRET` | 네이버 개발자 센터 → Client Secret | OAuth 사용 시 ✅ |
| `OAUTH_REDIRECT_BASE_URL` | (선택) `https://tkad.co.kr` 등 콜백 호스트. 미설정 시 요청 헤더에서 추론 | 선택 |

> **카카오 콘솔 등록 Redirect URI 예시**
> `https://tkad.co.kr/api/auth/oauth/kakao/callback`
> 프리뷰 도메인을 쓰려면 Vercel 배포 URL도 등록(여러 개 등록 가능).
>
> **네이버 콘솔 등록 Callback URL 예시**
> `https://tkad.co.kr/api/auth/oauth/naver/callback`

## 6. DB 마이그레이션 안전성

이번 추가는 **순수 additive**:

```diff
+ model UserOAuthAccount { ... }
  model User {
    ...
+   oauthAccounts UserOAuthAccount[]
  }
```

- 신규 테이블 `user_oauth_accounts` 만 생성됨.
- 기존 `users`, `user_sessions`, `user_favorite_media` 컬럼/인덱스 변경 0.
- 따라서 `prisma db push` 또는 `migrate dev` 시 데이터 손실 없음. (백업은 운영 정책상 권장하지만 이 변경 자체로는 손실 가능성 없음.)

## 7. 회원 유형 매핑

이슈 요구안 vs 현재 enum:

| 이슈 안 | `AppUserRole` (DB) | `CommunityMemberRole` (직군 라벨) | UI 노출 |
|---|---|---|---|
| ADVERTISER | `advertiser` | `ADVERTISER` | "광고주" |
| MEDIA_OWNER | `owner` | `MEDIA` | "매체사" |
| ADMIN | `admin` | — | (등록 불가 — 운영자만 부여) |
| (참고) AGENCY | `agency` | `AGENCY` | "대행사" — 기존 옵션, 그대로 유지 |
| (참고) FREELANCER | `advertiser` | `FREELANCER` | "프리랜서" — 기존 옵션 |

가입 폼은 `AppUserRole` 을 직접 노출하지 않고 `CommunityMemberRole` 라벨로 받음. 백엔드에서 `appRoleForCommunityRole()` 매핑 그대로 사용.

## 8. 후속 단계 체크리스트 (Phase B 이후)

- [ ] 플래너 저장 모달 + guest planner → user planner 이관
- [ ] 비밀번호 재설정 (이메일 토큰)
- [ ] 이메일 검증 발송 + 검증 페이지
- [ ] 매체사 전용 매체 등록 신청 UI
- [ ] 광고주/매체사 분기된 대시보드 위젯
- [ ] (선택) NextAuth v5 마이그레이션 — 필요해진 시점에 결정
