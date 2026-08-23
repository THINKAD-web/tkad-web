# Preview QA 테스트 계정 (A안)

Preview/스테이징에서 **LITE** 권한으로 플래너 결과·PDF·이메일 QA를 하기 위한 전용 계정.

## Vercel Preview 환경변수 (Production에는 넣지 말 것)

| 변수 | 예시 | 환경 |
|------|------|------|
| `ALLOW_QA_SEED` | `1` | **Preview only** |
| `QA_SEED_EMAIL` | `qa-preview@yourdomain.com` | Preview only |
| `QA_SEED_PASSWORD` | (강한 비밀번호) | Preview only — **Secret** |
| `QA_PRODUCTION_DATABASE_HOST` | `ep-xxxx.neon.tech` | Preview only (호스트만, URL 전체 아님) |

`QA_PRODUCTION_DATABASE_HOST`는 Production `DATABASE_URL`의 **호스트 부분만** 복사한다.  
비밀번호·전체 connection string은 넣지 않는다.

## 시드 실행

Preview DB URL이 `.env.preview.local`의 `DATABASE_URL`에 있을 때:

```bash
ALLOW_QA_SEED=1 \
VERCEL_ENV=preview \
QA_PRODUCTION_DATABASE_HOST='<production-neon-host>' \
QA_SEED_EMAIL='<preview-qa-email>' \
QA_SEED_PASSWORD='<from-vercel-secret>' \
npx tsx scripts/seed-preview-qa-account.mts
```

성공 시 `OK: Preview QA account ready` 와 이메일·`databaseHost`가 출력된다.  
비밀번호는 **출력되지 않음**.

## 로그인 방법 (Jaehan)

1. **Preview 배포 URL** 열기 (Vercel 대시보드 → 해당 PR → Visit)
2. 로그인: `https://<preview-host>/ko/login`
3. 이메일: Vercel Preview의 `QA_SEED_EMAIL`
4. 비밀번호: Vercel Preview의 `QA_SEED_PASSWORD`
5. 플래너: `https://<preview-host>/ko/planner`
6. PRO 게이트 없이 **제안서 PDF 생성**·**결과 화면**이 열리면 LITE 적용 확인

## 권한 확인

| 기능 | 최소 플랜 |
|------|-----------|
| 플래너 3단계 결과·지표 | LITE (`planner_result`) |
| 제안서 PDF / 이메일 발송 API | LITE (`planner_pdf`) |

로그인 후에도 🔒가 보이면:

- Preview DB에 시드가 안 돌았거나
- Production URL에 로그인했거나
- 다른 계정으로 로그인한 경우

## 계정 정보 확인 위치

- **DB:** `users` 테이블 — `email = QA_SEED_EMAIL`, `plan = LITE`
- **구독:** `subscriptions` — `plan = LITE`, `status = ACTIVE`
- **앱:** 로그인 후 플래너 Step 3에서 PDF 버튼 잠금 해제 여부

## 안전 가드 (스크립트)

1. `ALLOW_QA_SEED≠1` → 즉시 종료  
2. `VERCEL_ENV≠preview` → 종료  
3. `DATABASE_URL` 호스트 = `QA_PRODUCTION_DATABASE_HOST` → 종료  
4. 비밀번호는 env에서만 — 코드·git 없음  

## CI 스모크 (기존 C안)

자동 회귀는 `scripts/smoke-pricing-tiers-checkout.ts` + `TOSS_PAYMENTS_MOCK=1` 유지.  
수동 QA는 이 Preview 시드 계정 사용.
