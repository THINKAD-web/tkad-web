# THINKAD Hybrid Platform — 실행 계획: Pre-sprint ~ Sprint 3

> **기반 문서**: `docs/THINKAD-HYBRID-PLATFORM-PRD-V2.md` (PR #14 · 2026-04-20 머지)
> **작성일**: 2026-04-20 · **대상**: PM · FE/BE/디자인팀 · 매체본부 · 영업
> **작성 관점**: 10년+ 경력 실무 PM + 개발 리드 (Pre-sprint ~ Sprint 3 집중)
> **기간**: 2026-04-21 ~ 2026-06-15 (Pre-sprint 10일 + Sprint 1-3 총 7주)
> **베타 출시 목표**: 2026-08-07 (Phase 1 13주 종료 시점)

---

## 목차

1. [Pre-sprint 10일 상세 실행 계획 (2026-04-21 ~ 2026-04-30)](#1-pre-sprint-10일-상세-실행-계획)
2. [3트랙 병렬 개발 구조 (Sprint 1 착수 전 준비)](#2-3트랙-병렬-개발-구조)
3. [Sprint 1~3 상세 실행 계획 (주차별)](#3-sprint-13-상세-실행-계획)
4. [이번 주 (4/21~4/27) 즉시 착수 Top 5](#4-이번-주-4214-27-즉시-착수-top-5)
5. [Founders 프로그램 30명 운영 계획](#5-founders-프로그램-30명-운영-계획)
6. [리스크 & 완화 (이 단계 한정)](#6-리스크--완화-이-단계-한정)

---

## 1. Pre-sprint 10일 상세 실행 계획

### 1.1 일자별 개요 (2026-04-21 화 ~ 2026-04-30 목)

| Day | 날짜 | 요일 | 핵심 이벤트 | 주요 담당 |
|---|---|---|---|---|
| D1 | 04-21 | 화 | **킥오프 워크숍** (09:00~18:00, 전원) | PM |
| D2 | 04-22 | 수 | API 키 확보·계정 셋업 · 법무 계약서 초안 배포 | BE / 법무 |
| D3 | 04-23 | 목 | 매체사 CSV 수집 시작 (기존 200곳) · 디자인 시스템 킥오프 | 매체본부 / 디자인 |
| D4 | 04-24 | 금 | Figma → shadcn 토큰 매핑 · Founders 섭외 리스트 1차 확정 | 디자인 / 영업 |
| — | 04-25 | 토 | (비업무) async: 법무 검토 리드타임 | — |
| — | 04-26 | 일 | (비업무) async: Cloudinary·Resend 도메인 인증 대기 | — |
| D5 | 04-27 | 월 | 기술 스택 최종 확정 · 환경변수·Vercel 세팅 | BE / DevOps |
| D6 | 04-28 | 화 | 매체사 CSV 지오코딩 배치 · 검증 배지 시드 30곳 선정 | BE / 매체본부 |
| D7 | 04-29 | 수 | Founders 초청 이메일 발송 · 베타 티저 페이지 초안 | 영업 / 마케팅 |
| D8 | 04-30 | 목 | **Pre-sprint 회고 + Sprint 1 Day 0 준비** (16:00) · 3트랙 브리핑 | PM 전원 |

**핵심 원칙**
- **매 저녁 18:30 데일리 Async 업데이트**: Slack `#thinkad-presprint`에 각자 "오늘 한 것 / 내일 할 것 / 블로커" 3줄 공유 (강제)
- **주말은 "처리 대기" 시간**: 법무 검토·Cloudinary 도메인 인증·Toss 심사 등 외부 리드타임 활용
- **D8 회고 미팅 (30분) 필수**: Pre-sprint 산출물 확인 후 Sprint 1 즉시 착수 가능 여부 게이트

---

### 1.2 Day 1 (4/21 화) — 킥오프 워크숍 아젠다

**목적**: 경영진 · 매체본부 · 개발팀 세 집단이 **같은 그림**을 갖고 13주를 시작한다.

**참석자 (필수)**
- 경영진: 대표 · CSO · CFO
- 매체본부: 본부장 · 실사팀장 · 영업팀장
- 개발팀: PM · FE 리드 · BE 리드 · 디자인 리드 · DevOps (외주 PM)

**장소**: THINKAD 본사 대회의실 + Zoom 하이브리드 (원격 참여자 대비)

**타임라인 (09:00~18:00, 총 8시간 + 점심 1시간)**

| 시간 | 세션 | 담당 | 산출물 |
|---|---|---|---|
| 09:00~09:30 | **Opening**: 대표 비전 선언 + 13주 목표 공유 | 대표 | — |
| 09:30~10:30 | **PRD v2 워킹 리뷰** (7섹션 요약, 북극성 MCC, 전환 4축) | PM | PRD 공감대 |
| 10:30~10:45 | 커피 브레이크 | — | — |
| 10:45~12:00 | **매체본부 현황·고민 공유** (공실률·영업 데이터·검증 SOP·경쟁 위협) | 매체본부장 | As-Is 문서화 |
| 12:00~13:00 | 점심 (케이터링, 팀 믹스 좌석 배치) | — | — |
| 13:00~14:30 | **로드맵 워킹** (Phase 1 13주, Sprint별 목표·의존성) | PM | 스프린트 오너 선정 |
| 14:30~15:30 | **리스크 브레인스토밍** (R1~R5 외 현장 위험) + 대응 아이디어 | 전원 | 리스크 워크시트 |
| 15:30~15:45 | 휴식 | — | — |
| 15:45~17:00 | **3트랙 역할·책임 배정** (Infra/Design/Data 각 트랙 오너·팀원·산출물) | PM + 리드 | 트랙 RACI 표 |
| 17:00~17:30 | **Founders 30명 섭외 브레인스토밍** (광고주·대행사 리스트 초안) | 영업 | 초기 리스트 50명+ |
| 17:30~18:00 | **Closing**: 4/30 회고 일정 + 이번 주 Top 5 배정 + 기념 사진 | 대표 | 실행 체크리스트 |

**워크숍 규칙**
- 노트북은 공유 문서 작성 외 사용 금지 (집중도 유지)
- 모든 발언은 "사실 / 의견 / 질문"으로 명시적 구분
- 결정 사항은 화이트보드 실시간 기록 → 사진 → Notion 즉시 반영
- 이견은 Parking Lot에 보관 후 세션 말미 5분씩 회수

**사전 배포 자료 (4/18 금까지)**
- [ ] PRD v2 핵심 요약 (임원용 1페이지) — 이미 생성됨
- [ ] 7섹션 전체 파일 링크
- [ ] Figma 브랜드 가이드 (현재 `tailwind.config.ts` 실값)
- [ ] 경쟁사 HOO 최근 30일 활동 리포트 (있으면)
- [ ] 매체본부 지난 6개월 견적·계약 데이터 요약 (익명화)

**워크숍 후 산출물 (4/22 수 12:00까지)**
- [ ] 워크숍 회의록 (Notion)
- [ ] 트랙 RACI 표 (각 트랙 오너 · 팀원 · 산출물 · 마감)
- [ ] 리스크 워크시트 v1 (PRD v2 R1~R5 + 추가 리스크)
- [ ] Founders 섭외 초기 리스트 (광고주 30 + 대행사 15 = 45명 풀)
- [ ] 이번 주 Top 5 태스크 배정표

---

### 1.3 기존 매체사 200곳 CSV 일괄 등록 방법론 (D3~D6)

**목적**: **리스크 R5 (재고 부족)** 최대 방어. Pre-sprint 내 매체 500+ 시드 확보.

**단계별 방법론**

#### Step 1 (D3 목): 매체사 데이터 수집 · 통합 (매체본부 주도)

매체본부가 보유한 **기존 거래 매체사 자료**를 3소스에서 취합:
- (a) 영업 엑셀 시트 (지난 3년간 계약) — 약 150개
- (b) 매체본부 검증 기록 엑셀 — 약 80개
- (c) 전화·카톡 거래 매체사 명단 — 약 50개

**통합 작업** (매체본부 3인 공동, 1일)
- Google Sheets 마스터 시트 생성 (`thinkad-media-masterlist-v1`)
- 중복 제거 (사업자등록번호 기준)
- 예상 고유 매체사 **200곳 내외**, 매체(면) 수 **1,500~2,000면**

#### Step 2 (D3~D4): CSV 템플릿 작성 (BE 리드 주도)

**필수 컬럼** (Prisma `Media` 모델 정합)

| 컬럼명 | 예시 | 필수 | 비고 |
|---|---|---|---|
| `external_id` | `BUS-BSN-SHT-001` | ✅ | 매체사 고유 코드 |
| `name_ko` | 부산역 버스쉘터 A면 | ✅ | — |
| `owner_business_number` | 605-81-12345 | ✅ | 매체사 매핑 |
| `address_road` | 부산 동구 중앙대로 206 | ✅ | 자동 지오코딩 기준 |
| `category` | `bus_shelter` | ✅ | enum |
| `size_sqm` | 2.0 | — | — |
| `resolution` | - | — | 디지털만 |
| `is_digital` | false | ✅ | — |
| `operating_hours` | 00-24 | — | — |
| `price_base_monthly` | 1,200,000 | ✅ | KRW |
| `photo_urls` | `url1,url2` | — | 쉼표 구분 |
| `available_from` | 2026-06-01 | — | 공실 시작일 |
| `description_ko` | — | — | 자유기입 |

**템플릿 배포**
- Google Sheets 템플릿 + 가이드 문서
- 매체본부 실무자에게 **예시 10행** 미리 입력하여 배포

#### Step 3 (D5 월~D6 화): 자동 지오코딩 + 검증

**BE 워커 스크립트** (`scripts/import-media-csv.ts`, 신규)
```
1. CSV 파싱 (papaparse)
2. 각 행 Kakao Local API로 지오코딩 → lat/lng 획득
   - 실패 시 `error_column=address_road` 표시
3. `MediaOwner` 레코드 upsert (사업자번호 기준)
4. `Media` 레코드 create + `ownerId` 연결
5. 업로드 리포트 출력 (성공/실패/경고)
```

**실행 순서**
- Dry-run (DB 미반영, 에러만 리포트) → 매체본부 수정 → 실제 반영
- 지오코딩 실패 건은 **수작업 주소 교정** (매체본부 3시간 예상)
- 실패 5% 이하 목표

#### Step 4 (D6 화): 검증 배지 시드 30곳 선정

매체본부가 기존 실사 기록 있는 매체 중 **즉시 배지 부여 가능한 30곳** 선정:
- 입지·가시성·조도·경쟁 4개 항목 점수 기록 (엑셀)
- 현장 사진 4장/매체 이상 보유 확인
- **Sprint 4 플래너 AI 추천의 기반 데이터** (Verified Only 필터 작동 조건)

**데이터 보안 원칙**
- CSV 파일은 **사내망 전용 공유**, 외부 클라우드 업로드 금지
- 사업자번호는 PIPA 대상 정보 → 최소 접근 원칙 적용
- 업로드 완료 후 CSV 원본 30일 후 파기 (파기 대장 작성)

---

### 1.4 API 키·계약 체결 체크리스트 (D2~D5)

**원칙**: 모든 프로덕션 키는 **D5 (4/27 월) 17:00까지** Vercel Environment Variables에 세팅 완료. Sprint 1 Day 0 (5/4 월) 시작 시 블로커 제로.

#### Kakao Developers (지도·로그인)

- [ ] `4/22 수` 비즈 계정 가입 (사업자등록증 업로드)
- [ ] `4/22 수` 애플리케이션 2개 생성:
  - `thinkad-prod` (프로덕션)
  - `thinkad-staging` (스테이징)
- [ ] 플랫폼 등록: `https://thinkad.kr`, `https://beta.thinkad.kr`, `http://localhost:3000`
- [ ] 활성화할 제품:
  - Kakao Map (Web JS SDK) — **무료 한도 일 30만 호출 확인**
  - Kakao Map Static (Static Map API) — 제안서 PDF용
  - Kakao Local (주소 검색·지오코딩) — 매체사 CSV용
  - Kakao Login (OAuth) — 회원제용
- [ ] 환경변수:
  - `NEXT_PUBLIC_KAKAO_MAP_KEY` (JavaScript 키)
  - `KAKAO_REST_API_KEY` (서버용 REST 키 — 지오코딩·Static Map)
  - `KAKAO_LOGIN_CLIENT_ID` · `KAKAO_LOGIN_CLIENT_SECRET`
- [ ] **쿼터 경보 Slack Webhook** 설정 (무료 한도 80% 도달 시)
- **담당**: BE 리드 · **마감**: D3 (4/23 목) 18:00

#### Anthropic (Claude 4.7)

- [ ] `4/22 수` Workspace 생성 (프로덕션 키 + 스테이징 키 분리)
- [ ] **월 예산 Cap 설정**: Phase 1 기준 **$500/월** (초기 보수적)
- [ ] 사용량 80% 도달 Slack Webhook 연동 (Anthropic Admin API)
- [ ] 환경변수: `ANTHROPIC_API_KEY`
- [ ] 모델 접근 확인: `claude-sonnet-4-6`, `claude-opus-4-7` (Phase 1 실사용은 Sonnet 4.6 — 비용·품질 균형)
- [ ] **Prompt Caching 기능 활성 확인** (기본 활성이나 검증)
- [ ] 기존 코드 (`@anthropic-ai/sdk 0.88.0`) 호환성 점검 1회
- **담당**: BE 리드 · **마감**: D5 (4/27 월) 17:00

#### Cloudinary (이미지·VR·PDF 저장)

- [ ] `4/22 수` Plus Plan 업그레이드 (무료 → $89/월, equirectangular·transformation 대응)
- [ ] Folder 구조 생성:
  - `thinkad/media/` (매체 사진)
  - `thinkad/vr/` (VR equirectangular)
  - `thinkad/quotes/` (제안서 PDF 임시 저장, 7일 TTL)
  - `thinkad/owner/` (사업자등록증)
- [ ] **Signed URL 정책 설정** (PDF 공개 웹뷰 보안용, 5분 TTL)
- [ ] Upload Preset: `thinkad_media_unsigned` (매체 사진만, 크기 10MB 제한)
- [ ] 환경변수: `CLOUDINARY_CLOUD_NAME` · `CLOUDINARY_API_KEY` · `CLOUDINARY_API_SECRET` · `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- [ ] 워터마크 텍스트 레이어 템플릿 생성 (VR·견적 PDF용)
- **담당**: BE 리드 + 디자인 · **마감**: D3 (4/23 목)

#### Resend (이메일)

- [ ] `4/22 수` Resend 계정 + `thinkad.kr` 도메인 인증 시작
- [ ] DNS 레코드 추가 (SPF · DKIM · DMARC) — **DNS 관리자 협조 필요**
  - SPF: `v=spf1 include:_spf.resend.com ~all`
  - DKIM: Resend 제공 CNAME 2개
  - DMARC: `v=DMARC1; p=quarantine; rua=mailto:dmarc@thinkad.kr`
- [ ] 인증 완료 확인 (보통 2~24시간 소요) — **주말에 리드타임 흡수**
- [ ] 발신 이메일 주소 확정:
  - `no-reply@thinkad.kr` (트랜잭션)
  - `hello@thinkad.kr` (Founders 커뮤니케이션)
  - `beta@thinkad.kr` (베타 피드백 수신)
- [ ] Webhook endpoint 준비 (`/api/webhooks/resend` — 바운스·스팸 처리)
- [ ] 환경변수: `RESEND_API_KEY`
- **담당**: BE + DNS 관리자 · **마감**: D5 (4/27 월) — DNS 전파 고려

#### Toss Payments (결제)

- [ ] `4/21 화` 가맹점 심사 신청 (사업자등록증·통장사본·대표자 신분증·홈페이지 URL)
- [ ] 심사 기간: 평균 **3~5 영업일** → Pre-sprint 끝 무렵 (D8 4/30) 결과 기대
- [ ] 테스트 키 즉시 발급 → Sprint 1 개발 착수 가능
- [ ] 환경변수:
  - `NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY` (테스트 → 프로덕션 교체; Vercel에 수동 등록)
  - `TOSS_PAYMENTS_SECRET_KEY` (서버 전용 Secret)
  - (향후) `TOSS_WEBHOOK_SECRET`
- [ ] **지원 결제 수단** 확정: 카드 + 계좌이체 + 카카오페이 + 네이버페이 (Phase 1)
- [ ] 세금계산서 자동 발행 옵션 활성
- **담당**: CFO + BE 리드 · **마감**: 신청 D1 (4/21), 프로덕션 키 D8 예상

#### 부가: Upstash Redis · Sentry · Vercel

- [ ] Upstash Redis: Serverless 플랜, 지역 `ap-northeast-2` (서울)
  - 환경변수: `UPSTASH_REDIS_REST_URL` · `UPSTASH_REDIS_REST_TOKEN`
- [ ] Sentry: 프로젝트 2개 (`thinkad-web-prod` · `thinkad-web-staging`) + DSN
  - 환경변수: `SENTRY_DSN` · `SENTRY_AUTH_TOKEN`
- [ ] Vercel: 프로젝트 세팅, Preview Deploy 활성, 팀 전원 초대
  - Environment Variables (Production / Preview / Development 3-tier)
- [ ] 모두싸인 (전자서명): 계정 생성, Sprint 5에 통합 예정 (심사 불필요, 즉시 사용)
- [ ] VAPID 키 쌍 생성 (Web Push — Sprint 5 대비): `npx web-push generate-vapid-keys`

**환경변수 총 정리** (Vercel Dashboard에 D5까지 반영)

약 18개 환경변수 관리. **`.env.example` 파일을 저장소에 커밋**하되 실제 값은 Vercel에만 저장.

---

### 1.5 Founders 프로그램 섭외 리스트 초안 (D4~D7)

상세 운영 방식은 §5 참조. 여기는 Pre-sprint 중 **섭외 리스트 확정·1차 발송**에 한정.

**D4 (4/24 금)**: 섭외 풀 확정 (광고주 30 + 대행사 15 + 매체사 5 = **총 50명 풀**, 30명 확정 목표)

| 카테고리 | 목표 수 | 풀 크기 | 출처 |
|---|---|---|---|
| **광고주 (기존 거래)** | 20명 | 30명 | 지난 2년 계약 광고주 Top |
| **광고주 (잠재)** | 5명 | 10명 | 영업 파이프라인 Warm Lead |
| **대행사 파트너** | 5명 | 10명 | 기존 제휴·인맥 대행사 |
| (참고) 매체사 | — | 5명 | Phase 2 Sprint 7 Founders Owner용 사전 예약 |

**섭외 우선순위 점수 기준** (영업팀 내부)
- 최근 12개월 내 THINKAD와 실거래 있음 (+3)
- 연간 OOH 예산 1억원+ (+2)
- OOH 외 디지털 광고도 활발 (+1) — 피드백 다양성
- 공개 추천·증언 가능 (+1) — 베타 종료 후 마케팅 자산

**D7 (4/29 수)**: **Founders 초청 이메일 1차 발송** (Resend 템플릿 사용)

이메일 템플릿 핵심 요소:
- 제목: "[초청] THINKAD 베타 Founders 프로그램 — 선착순 30명"
- 본문: 비전 한 줄 + 3대 혜택(수수료 면제 3개월·Founding Customer 배지·피드백 콜) + CTA 버튼
- 수락 기한: 5/7 (Sprint 1 W1 종료 전) — 리마인드 5/4 자동 발송
- 수락 시: Calendly 링크 (주 1회 피드백 콜 자동 예약)

**발송 후 추적**
- Resend Dashboard로 Open rate · Click rate 실시간 모니터
- 1차 발송 72시간 후 미응답자 2차 리마인드
- 수락 15명 이하 시 영업팀 추가 콜드콜 라운드 가동

---

## 2. 3트랙 병렬 개발 구조

### 2.1 개요

**Sprint 1의 3주 확장 비용을 흡수하는 핵심 장치** — Pre-sprint 10일 + Sprint 1 3주 = 약 4.5주간 3개 트랙이 독립적으로 진행되다, Sprint 1 종료 시점(W3 말)에 합류하여 Sprint 2부터 전속력 기능 개발에 돌입.

```
 Pre-sprint     Sprint 1 (W1-3)                Sprint 2~
─────────────  ──────────────────────────    ─────────────
[Track A]     Infra · 인증 · OAuth · 세션 동기화  ─┐
                                                    ├─▶ 합류 (W3 말) ─▶ 정상 2주 스프린트
[Track B]     Design System · Figma → shadcn       │
                                                    │
[Track C]     Data · 매체사 CSV · 배지 시드 30곳     ─┘
```

### 2.2 Track A — Infra / 인증 (BE 리드 주도)

**목표**: Sprint 1 말까지 **인증·세션·DB 인프라 완성**하여 Sprint 2의 기능 개발이 인증 구조 걱정 없이 시작되도록.

| 항목 | 담당 | 기간 | 의존성 |
|---|---|---|---|
| 인증 라이브러리 스파이크 (next-auth v5 vs 자체 세션) | BE 리드 | D1~D5 | — |
| Prisma 신규 모델 마이그레이션 (User · UserSession · UserOAuthAccount · UserFavoriteMedia · PlannerPlan) | BE 엔지니어 1 | W1 | Pre-sprint DB 셋업 완료 |
| Credentials + Kakao + Google 3채널 OAuth | BE 엔지니어 2 | W1~W2 | Track A 스파이크 결정 · Kakao 키 |
| `app/(auth)/login` · `/register` · `/forgot-password` UI | FE 1 (임시 합류) | W2 | Track B Design System |
| **localStorage ↔ 서버 세션 동기화 훅** (F1.4 핵심) | FE 1 + BE | W2~W3 | Prisma PlannerPlan 모델 |
| 미들웨어 `/my/*` 보호 + role 분기 | BE 리드 | W3 | 위 인증 완성 |
| 세션 IP 바인딩 · CSRF · rate-limit · audit log 기반 | BE 엔지니어 2 | W3 | Upstash Redis |
| E2E 시나리오 (이메일 가입·Kakao 로그인·localStorage 동기화) | FE/QA | W3 | 전 항목 통합 |

**Track A 산출물 (W3 말 체크)**
- [ ] E2E 3개 시나리오 통과: 이메일 가입 → 인증 → 로그인 / Kakao 로그인 → 프로필 연동 / 비로그인 플래너 저장 → 로그인 → 서버 이관
- [ ] `/my` 접근 시 role별 리다이렉트 작동 (advertiser/agency/owner)
- [ ] rate-limit · audit log · CSRF 기반 통합 테스트 통과

**Track A 리스크**
- next-auth v5 App Router 호환 이슈 (조기 스파이크 1~2일 필수)
- Kakao OAuth 심사 지연 — 비즈 계정 승인 지연 시 Credentials만 먼저 출시 검토

---

### 2.3 Track B — Design System (디자인 리드 주도)

**목표**: Sprint 2 지도 MVP부터 **모든 컴포넌트가 Design Token 위에서 동작**하도록 shadcn 기반 디자인 시스템 완성.

| 항목 | 담당 | 기간 | 의존성 |
|---|---|---|---|
| Figma 브랜드 가이드 정리 (tailwind.config.ts 실값 반영) | 디자인 리드 | Pre-sprint D3~D4 | — |
| shadcn/ui 설치 + 테마 오버라이드 (navy·gold·cta 토큰) | FE 1 | D5~W1 | Figma 최종 |
| 기본 컴포넌트 목록 확정 (Button · Input · Card · Dialog · Dropdown · Tabs · Badge · Toast 8종) | 디자인 + FE 1 | W1 | — |
| 커스텀 컴포넌트 (VerificationBadge · MediaCard · BottomSheet · FilterChip) | FE 1 | W2~W3 | 기본 8종 완료 |
| Storybook 설치 + 디자인 시스템 컴포넌트만 문서화 | FE 1 | W3 | 위 완료 |
| 반응형 Breakpoint 표준화 (sm/md/lg/xl) + 터치 타겟 44×44 룰 적용 | 디자인 + FE 1 | W2 | — |
| 접근성 최소선 체크 (키보드 내비게이션 · ARIA label · 명도 4.5:1) | FE 1 | W3 | — |

**Track B 산출물 (W3 말 체크)**
- [ ] 12종 컴포넌트 Storybook 공개 (URL: `storybook.thinkad.kr` 또는 Vercel Preview)
- [ ] Figma ↔ 코드 토큰 1:1 매핑 완료 (색·폰트·radius·shadow)
- [ ] 반응형 Playground 페이지 (sm/md/lg/xl 자동 시연)

**Track B 리스크**
- Figma 최신 상태와 `tailwind.config.ts` 불일치 가능 → D3 Day 1에 전면 대조
- 디자인 인력 1명으로 8종 + 커스텀 4종 3주 내 가능? — **Sprint 2 합류 후 Sprint 3까지 보강**

---

### 2.4 Track C — Data (매체본부 + BE 1명 주도)

**목표**: Pre-sprint 말까지 **Verified 매체 300곳 시드 + 검증 배지 30곳**을 DB에 적재하여, Sprint 4 플래너 AI가 실제 데이터로 학습·추천 가능하게.

| 항목 | 담당 | 기간 | 의존성 |
|---|---|---|---|
| 매체사 CSV 수집·통합 (200개) | 매체본부 3인 | D3~D4 | — |
| CSV 템플릿 + 가이드 작성 | BE 엔지니어 1 | D3 | Prisma Media 스키마 |
| 지오코딩 배치 스크립트 (`scripts/import-media-csv.ts`) | BE 엔지니어 1 | D4~D5 | Kakao Local API 키 |
| Dry-run → 에러 교정 → 실제 반영 | BE + 매체본부 | D6~D7 | 위 스크립트 |
| **검증 배지 시드 30곳** 선정·점수 입력·사진 업로드 | 매체본부 2인 | D6~W1 | 매체 레코드 완성 |
| Phase 2 검증 배지 관리 UI 요구사항 (Sprint 10 참조) 문서화 | 매체본부장 | W2 | 매체본부 SOP |
| 매체 사진 Cloudinary 마이그레이션 (기존 폴더 → `thinkad/media/*`) | BE 엔지니어 1 | W1~W2 | Cloudinary 폴더 |

**Track C 산출물 (W3 말 체크)**
- [ ] `Media` 테이블 레코드 **1,500행+** (중복 제거 후)
- [ ] `MediaOwner` 레코드 **200행** (사업자등록번호 upsert)
- [ ] `MediaVerificationBadge` 시드 **30곳** (Gold/Silver/Bronze 분포 포함)
- [ ] Cloudinary 매체 사진 **1,000+ 장** 업로드 완료
- [ ] 지오코딩 성공률 **95%+**

**Track C 리스크**
- 매체본부 2인의 CSV 수작업 부담 — **영업팀 인턴 1명 보강 검토**
- 사진 데이터 부재 매체 — 현장 촬영 일정 Sprint 2에 병행 배치

### 2.5 트랙 합류 (W3 말, 5/22 금) 체크리스트

Sprint 2(5/25 월) 시작 전 **합류 리뷰 미팅 (60분)**:
- [ ] 3트랙 산출물 모두 체크박스 통과
- [ ] Sprint 2 지도 MVP에 필요한 **기반 레이어**가 다 준비됐는지:
  - 인증 작동 (Track A)
  - MediaCard 컴포넌트 (Track B)
  - Media 데이터 1,500행+ + lat/lng (Track C)
- [ ] 미처리 항목 Sprint 2 Backlog로 이관 (max 20% 이내)
- [ ] Sprint 2 Day 1 (5/25 월) Kickoff 일정 확정

---

## 3. Sprint 1~3 상세 실행 계획

### 3.1 Sprint 1 (W1-3, 2026-05-04 ~ 2026-05-22, **3주**) — 인증 기반 + 회원 모델

> **왜 3주인가**: next-auth v5 + Kakao/Google 3채널 + localStorage↔서버 동기화 + role 분기 미들웨어 + 통합 테스트까지 포함. 2주로는 불충분 (PRD v2 §5.4 반영).

#### 3.1.1 Sprint 목표 (Sprint Goal)

> **"로그인·회원가입·소셜 로그인·localStorage 세션 동기화가 안정적으로 작동하여 `/my` 진입이 가능한 상태 달성."**

#### 3.1.2 주차별 작업 분해 (Work Breakdown)

**W1 (5/4 월 ~ 5/8 금): 백엔드 기반**

| Day | 작업 | 담당 | 산출물 |
|---|---|---|---|
| 월 | Sprint 1 Kickoff 미팅 (09:00~10:00) · 인증 스파이크 착수 | PM · BE 리드 | Sprint 1 백로그 확정 |
| 월~화 | 인증 라이브러리 결정 (next-auth v5 vs 자체) | BE 리드 | 의사결정 문서 |
| 화~수 | Prisma 신규 모델 5종 마이그레이션 (dev → staging) | BE 엔지니어 1 | 마이그레이션 통과 |
| 수~목 | Credentials 로그인 API (`/api/auth/login`) + argon2id 해싱 | BE 엔지니어 2 | Postman 테스트 통과 |
| 목~금 | 이메일 인증 토큰 발급·검증 (Resend 연동) | BE 엔지니어 2 | E2E 1회 수동 테스트 |
| 금 | **W1 회고 (30분, 16:00)** | 전원 | 블로커 정리 |

**W2 (5/11 월 ~ 5/15 금): 소셜 로그인 + 프런트 UI**

| Day | 작업 | 담당 | 산출물 |
|---|---|---|---|
| 월~화 | Kakao OAuth 통합 (`/api/auth/oauth/kakao/start` · `/callback`) | BE 엔지니어 1 | 실제 Kakao 로그인 성공 |
| 월~화 | Google OAuth 통합 (OIDC) | BE 엔지니어 1 | 동일 |
| 월 | `app/(auth)/login` · `/register` · `/forgot-password` UI 구현 | FE 1 (Track B 겸임) | Figma 대비 90%+ |
| 화~수 | `/my` 기본 레이아웃 + 빈 탭 7개 (§PRD v2 F1.4) | FE 2 | 세로 네비 작동 |
| 수~목 | **localStorage ↔ PlannerPlan 서버 동기화 훅** (`useAuthSync`) | FE 2 + BE 리드 | 로그인 시 자동 이관 |
| 목~금 | 미들웨어 `/my/*` 보호 + role 분기 (`middleware.ts`) | BE 리드 | 권한 테스트 통과 |
| 금 | **W2 회고** | 전원 | — |

**W3 (5/18 월 ~ 5/22 금): 보안·통합 테스트·트랙 합류**

| Day | 작업 | 담당 | 산출물 |
|---|---|---|---|
| 월~화 | 세션 IP 바인딩 · CSRF (Origin) · rate-limit (Redis) | BE 엔지니어 2 | 보안 통합 테스트 |
| 월~화 | AuditLog 테이블 + 기본 기록 훅 (로그인·OAuth·role 전환) | BE 리드 | 로그 샘플 확인 |
| 화~수 | Playwright E2E 3개 시나리오 | QA/FE | GitHub Actions 통과 |
| 수~목 | 성능 첫 측정 (Lighthouse 모바일 초기치) | FE 2 | 기준선 숫자 확보 |
| 목 | **Track 합류 미팅** (Track B·C 산출물 확인, 16:00) | PM · 리드 | Sprint 2 레디 체크리스트 |
| 금 | **Sprint 1 Review + Retro** (14:00~17:00) · 데모 세션 | 전원 | Sprint 2 백로그 확정 |

#### 3.1.3 Sprint 1 산출물 (Definition of Done)

**기능 DoD**
- [ ] 이메일 가입 → 인증 메일 → 로그인 → `/my` 진입 E2E 통과
- [ ] Kakao 로그인 → 프로필 자동 연동 → `/my` 진입 통과
- [ ] Google 로그인 동일 동작
- [ ] 비로그인 플래너 저장(localStorage) → 로그인 → 서버 자동 이관 확인
- [ ] 비로그인 사용자가 `/my/*` 접근 시 `/login?redirect=` 리다이렉트
- [ ] `role=agency` 사용자 `/my` 접근 시 `/partner` (Phase 3까지 placeholder) 리다이렉트

**기술 DoD**
- [ ] Prisma 신규 모델 5종 staging 마이그레이션 완료
- [ ] 비밀번호 argon2id 해싱 적용
- [ ] 세션 IP 바인딩 작동
- [ ] rate-limit IP당 분당 20회·userId 분당 60회
- [ ] Sentry 설치 + 첫 에러 캐치 검증

**프로세스 DoD**
- [ ] Playwright E2E 3개 시나리오 GitHub Actions 통과
- [ ] Code review 100% (PR 2인 승인 룰)
- [ ] Staging 배포 완료 (`staging.thinkad.kr`)

#### 3.1.4 Sprint 1 주요 리스크

| # | 리스크 | 대응 |
|---|---|---|
| S1-R1 | next-auth v5가 Next.js 16.2.3 App Router 일부 api와 충돌 | W1 월~화 스파이크 결과로 Go/No-Go 결정. No-Go 시 자체 세션(기존 AdminUser 구조 재사용) 즉시 전환 |
| S1-R2 | Kakao 비즈 계정 승인 지연으로 OAuth 개발 블록 | Credentials + Google만 W2에 출시, Kakao는 W3에 합류 (병렬 가능) |
| S1-R3 | localStorage 동기화 훅이 플래너 중첩 상태 (편집 중 로그인) 처리 실패 | Conflict 케이스 3종 (`empty server + existing local`, `both exist, server newer`, `both exist, local newer`)를 케이스 맵으로 초안 후 테스트 |
| S1-R4 | FE 1명이 Track B 겸임으로 인해 `/login` UI 지연 | Design System 기본 Button·Input·Card만 W1에 먼저 완성 → `/login` W2 초 착수 |

---

### 3.2 Sprint 2 (W4-5, 2026-05-25 ~ 2026-06-05, **2주**) — 지도 MVP

#### 3.2.1 Sprint 목표

> **"`/media` 페이지에서 지도·리스트 토글·필터·핀 클릭·제안서 담기가 모바일·PC 모두 60fps로 작동한다."**

#### 3.2.2 주차별 작업 분해

**W4 (5/25 월 ~ 5/29 금): 지도 뼈대 + API 확장**

| Day | 작업 | 담당 | 산출물 |
|---|---|---|---|
| 월 | Sprint 2 Kickoff · 지도 MVP 범위 재확인 | PM · FE 리드 | Sprint 2 백로그 |
| 월~화 | `fetchPublicMediaCatalog` 확장 (bbox · radiusKm · centerLat · centerLng) | BE 리드 | 단위 테스트 통과 |
| 월~화 | `Media.@@index([latitude, longitude])` 마이그레이션 | BE 엔지니어 1 | 쿼리 성능 100ms 이내 |
| 화~수 | Kakao Map SDK 통합 + `next/dynamic ssr:false` | FE 1 | 지도 로드 확인 |
| 수~목 | `components/media-map-view.tsx` 기본 구조 + 클러스터러 | FE 1 | 1,000 더미 매체 렌더 |
| 목~금 | 사이드 카드 컴포넌트 (썸네일·가격·배지·CTA) | FE 2 | Track B Card 재사용 |
| 금 | **W4 회고** | 전원 | — |

**W5 (6/1 월 ~ 6/5 금): 필터·반응형·장바구니**

| Day | 작업 | 담당 | 산출물 |
|---|---|---|---|
| 월~화 | 필터 바 (카테고리·가격대·Verified Only) + URL 쿼리 동기화 (debounce 500ms) | FE 2 | URL 공유 동작 |
| 화~수 | 반응형: 모바일 바텀시트 (70/30 → 드래그) + 태블릿 40/60 | FE 1 | 3 해상도 수동 테스트 |
| 수~목 | "제안서에 담기" 장바구니 (localStorage + 로그인 시 서버) | FE 2 + BE | 장바구니 +1 동작 |
| 수~목 | 반경 검색 (우클릭·롱탭 → 500m/1km/2km 팝업) | FE 1 | 반경 쿼리 동작 |
| 목 | 성능 감사: 1,000 매체 60fps · LCP < 2.5s · 지도 이동 debounce 동작 | QA/FE | Lighthouse 리포트 |
| 금 | **Sprint 2 Review + Demo · Retro** | 전원 | Sprint 3 백로그 |

#### 3.2.3 Sprint 2 산출물 (DoD)

- [ ] `/media` 지도/리스트 토글 작동
- [ ] 클러스터러 + 핀 개별 클릭 + 사이드 카드 모두 작동
- [ ] 필터 3종 (카테고리·가격대·Verified Only) + URL 쿼리 양방향 동기화
- [ ] 모바일 바텀시트 드래그 작동 (iOS Safari · Android Chrome)
- [ ] 반경 검색 500m/1km/2km
- [ ] 장바구니 담기 → 우상단 뱃지 즉시 반영 + localStorage/서버 저장
- [ ] Playwright E2E: 지도 로드 → 필터 적용 → 핀 클릭 → 장바구니 담기
- [ ] Lighthouse 모바일 Performance ≥ 85

#### 3.2.4 Sprint 2 주요 리스크

| # | 리스크 | 대응 |
|---|---|---|
| S2-R1 | Kakao Map 무료 일 30만 호출 초과 (스테이징 테스트로 소진) | 테스트는 dev 키 분리 사용 · Sprint 2 말 호출량 분석 · Naver Map 폴백 스파이크 Sprint 3 |
| S2-R2 | 클러스터러 1,000 매체 렌더 60fps 미달 | Canvas 렌더러 옵션 테스트 + 뷰포트 밖 카드 Intersection Observer 언마운트 |
| S2-R3 | 모바일 바텀시트 드래그 스크롤 충돌 (지도 드래그와 제스처 conflict) | `pointer-events` · `touch-action` 세밀 분리 · 실기기 iOS/Android 각 1대 수동 QA |
| S2-R4 | URL 쿼리 변경 시 지도 플리커 | `router.replace({ scroll: false })` + 상태 관리 훅 debounce |

---

### 3.3 Sprint 3 (W6-7, 2026-06-08 ~ 2026-06-19, **2주**) — My THINKAD + 장바구니

#### 3.3.1 Sprint 목표

> **"로그인 사용자가 저장된 플래너·즐겨찾기·견적 이력·대시보드를 `/my`에서 확인하고, 비로그인 장바구니·플래너가 로그인 시 매끄럽게 이관된다."**

#### 3.3.2 주차별 작업 분해

**W6 (6/8 월 ~ 6/12 금): 대시보드·탭 구성**

| Day | 작업 | 담당 | 산출물 |
|---|---|---|---|
| 월 | Sprint 3 Kickoff · 대시보드 와이어프레임 최종 확정 | PM · 디자인 | 와이어프레임 승인 |
| 월~화 | `GET /api/my/dashboard` 집계 API (진행캠페인·저장플랜·미확인알림 카운트) | BE 리드 | JSON 응답 확인 |
| 화~수 | `/my` 대시보드 요약 카드 3종 + Hero (이름 · 마지막 로그인) | FE 1 | Figma 대비 95%+ |
| 수~목 | `/my/plans` 저장된 플래너 그리드 (썸네일 = 매체 분포 미니맵) | FE 2 | CRUD 동작 |
| 목~금 | `PlannerPlan` CRUD API (`GET/POST/DELETE /api/my/plans`) | BE 엔지니어 1 | Postman 통과 |
| 금 | W6 회고 | 전원 | — |

**W7 (6/15 월 ~ 6/19 금): 즐겨찾기·견적 이력·추천 액션**

| Day | 작업 | 담당 | 산출물 |
|---|---|---|---|
| 월~화 | `/my/favorites` 즐겨찾기 그리드 + 매체 카드 하트 토글 | FE 2 | 낙관 업데이트 작동 |
| 월~화 | `UserFavoriteMedia` CRUD + 매체 상세·카드에 하트 연동 | BE 엔지니어 1 | 즉시 반영 |
| 화~수 | `/my/quotes` 견적 이력 (Phase 1 초기는 빈 상태 — Sprint 5에 채워짐) | FE 1 | 빈 상태 UI |
| 수~목 | **추천 액션 리스트** ("저장된 플랜 제안서 요청" · "즐겨찾기 매체 가격 변동") | FE 2 + BE | 규칙 엔진 초안 |
| 목 | 성능 감사: `/my` 첫 로딩 < 1.5s · 모바일 드로어 네비 작동 | QA/FE | 보고서 |
| 금 | **Sprint 3 Review + Demo · Retro** · Sprint 4(플래너) 사전 브리핑 | 전원 | Sprint 4 레디 |

#### 3.3.3 Sprint 3 산출물 (DoD)

- [ ] `/my` 대시보드 요약 카드 3종 작동 (진행캠페인·저장플랜·미확인알림)
- [ ] `/my/plans` 저장된 플래너 CRUD 완료
- [ ] `/my/favorites` 매체 즐겨찾기 토글 즉시 반영
- [ ] `/my/quotes` 빈 상태 UI (Sprint 5에 데이터 연결)
- [ ] 추천 액션 카드 최소 2종 (저장 플랜 · 즐겨찾기 가격 변동)
- [ ] 모바일 드로어 네비 작동 (햄버거 → 슬라이드인)
- [ ] E2E: 로그인 → `/my` → 플래너 저장 → 로그아웃 → 재로그인 → 플랜 복원

#### 3.3.4 Sprint 3 주요 리스크

| # | 리스크 | 대응 |
|---|---|---|
| S3-R1 | 집계 API 쿼리 느림 (대시보드 N+1) | Prisma `select` 최적화 + `unstable_cache` 60s · 측정 > 200ms 시 비정규화 캐시 테이블 도입 검토 |
| S3-R2 | 저장 플래너 썸네일(매체 분포 미니맵) 렌더 부담 | Sprint 3 스코프에선 정적 이미지 placeholder → Sprint 4 실제 미니맵 연동 |
| S3-R3 | Sprint 4 플래너 위자드가 Sprint 3의 `PlannerPlan` 스키마 변경을 유발 | Sprint 3 마지막 날 Sprint 4 PM·BE 리드 "스키마 Freeze" 미팅 (60분) |

---

## 4. 이번 주 (4/21~4/27) 즉시 착수 Top 5

> 4/28부터 Pre-sprint 후반(D6~D8)이 시작되므로 **4/27 일까지 Top 5 전부 완료** 필수.

### Top 1. 🚀 킥오프 워크숍 운영 (4/21 화, 09:00~18:00)

- **담당**: PM (주관) · 대표 (Opening) · 매체본부장 (As-Is 세션) · 리드 전원
- **마감**: 4/21 화 18:00
- **산출물**:
  - [ ] 워크숍 회의록 (Notion, 4/22 12:00까지)
  - [ ] 트랙 RACI 표
  - [ ] 리스크 워크시트 v1
  - [ ] 이번 주 Top 5 태스크 배정표

### Top 2. 🔑 Kakao + Anthropic + Cloudinary 계정·키 확보 (4/22~4/23)

- **담당**: BE 리드 · CFO (Kakao 비즈 승인 서류)
- **마감**: 4/23 목 18:00
- **산출물**:
  - [ ] Kakao 비즈 애플리케이션 2개 (prod·staging) + 환경변수 세팅
  - [ ] Anthropic Workspace + 월 예산 Cap $500
  - [ ] Cloudinary Plus 업그레이드 + 폴더 구조 생성
  - [ ] `.env.example` 파일 저장소 커밋 (실제 값은 Vercel만)

### Top 3. 📊 매체사 CSV 통합 작업 착수 (4/23~4/27)

- **담당**: 매체본부 3인 (수집) + BE 엔지니어 1 (템플릿·검증)
- **마감**: 4/27 월 18:00 (Dry-run 시작 가능 상태)
- **산출물**:
  - [ ] Google Sheets 마스터 시트 `thinkad-media-masterlist-v1`
  - [ ] 중복 제거 후 200개 내외 매체사 · 1,500행+ 매체
  - [ ] CSV 템플릿 + 가이드 문서 (매체본부 공유)

### Top 4. 💌 Founders 섭외 리스트 초안 + 초청 이메일 템플릿 (4/24~4/27)

- **담당**: 영업팀장 (리스트) · PM (템플릿 카피) · 디자인 (이메일 HTML)
- **마감**: 4/27 월 18:00
- **산출물**:
  - [ ] Founders 섭외 풀 50명 (광고주 30 + 대행사 15 + 매체사 예비 5)
  - [ ] 점수 기준 적용 → Top 30 우선순위 확정
  - [ ] Resend 이메일 템플릿 HTML + 플레인 텍스트 각 1
  - [ ] Calendly 링크 (피드백 콜 예약용) 준비

### Top 5. 🎨 Figma 브랜드 가이드 ↔ tailwind.config.ts 대조 (4/23~4/25)

- **담당**: 디자인 리드 · FE 1
- **마감**: 4/25 토 (async ok) 또는 4/27 월
- **산출물**:
  - [ ] Figma 토큰 vs 코드 토큰 불일치 목록
  - [ ] 불일치 해소 계획 (수정 주체 결정: Figma 변경 vs 코드 변경)
  - [ ] shadcn 설치 착수 (D5 월부터 시작 가능 상태)

### 일일 Async 업데이트 템플릿 (Slack `#thinkad-presprint`, 매일 18:30)

```
【4/xx 화】 — 홍길동 (역할)
✅ 오늘 완료:
  - 항목 1
  - 항목 2
📌 내일 계획:
  - 항목 1
🚧 블로커:
  - 없음 / 내용
```

---

## 5. Founders 프로그램 30명 운영 계획

### 5.1 프로그램 목적

1. **PMF 신호 확보**: Sprint 6 직후 MCC 20건 즉시 달성 (OKR KR2.2)
2. **정성 피드백**: NPS · 플래너 완주율 · 제안서 전환율 원인 분석
3. **마케팅 자산**: 성공 사례 3~5건 확보 → 정식 출시 마케팅 재료

### 5.2 섭외 방법

#### 타겟 구성

| 카테고리 | 30명 배분 | 선정 기준 |
|---|---|---|
| **기존 거래 광고주** | 20명 | 지난 12개월 실거래 + 연 OOH 1억원+ |
| **잠재 광고주 (Warm)** | 5명 | 영업 파이프라인 top · OOH 검토 중 |
| **대행사 파트너** | 5명 | 기존 제휴 대행사 · Phase 3 Partner 포털 연결 의향 |

#### 섭외 채널

- **1차 (D7, 4/29 수)**: Resend 개인 맞춤 이메일 (영업팀장 발신 명의)
- **2차 (5/4 월)**: 미응답자에 리마인드 메일 + 영업팀 전화 콜
- **3차 (5/8 금)**: 확정 30명 + 예비 10명 리스트 확정
- 수락 기한: **5/11 월까지** (Sprint 1 W1 종료 전)

#### 이메일 핵심 카피 (초안)

```
제목: [초청] THINKAD 베타 Founders — 선착순 30명

안녕하세요, ○○님.

THINKAD가 14년간 쌓은 현장 검증 역량을 디지털 플랫폼으로 전환합니다.
30명의 Founding Customer에게 가장 먼저 열어드립니다.

▶ 3대 혜택
  1. 베타 3개월 수수료 100% 면제
  2. "Founding Customer" 영구 배지
  3. PM 주 1회 30분 피드백 콜 (제품 방향 직접 영향)

▶ 시작일: 2026-08-07
▶ 수락 기한: 2026-05-11

[ 참여 확정하기 ]  [ 30분 상담 예약하기 ]
```

### 5.3 혜택 패키지

| 혜택 | 범위 | 적용 기간 |
|---|---|---|
| **수수료 100% 면제** | 셀프/어시스트 견적 수수료 전체 | 2026-08-07 ~ 2026-11-07 (3개월) |
| **Founding Customer 배지** | `/my` 프로필·발행 PDF에 영구 표기 | 영구 |
| **PM 피드백 콜** | 주 1회 30분 · PM 직접 · Calendly 자동 예약 | 베타 3개월 |
| **기능 투표권** | Notion 공개 로드맵 투표·코멘트 | 베타 3개월 |
| **우선 배정** | 검증 실사 우선권 (자사 광고 매체 실사 선순위) | 베타 3개월 |
| **바운티** | 크리티컬 버그 신고 1건당 10만원 문화상품권 (최대 3건/인) | 베타 3개월 |

### 5.4 피드백 수집 방식

#### 주간 루틴

| 요일 | 활동 | 담당 | 목적 |
|---|---|---|---|
| 월 | Notion 공개 로드맵 업데이트 (지난주 릴리즈 · 금주 계획) | PM | 투명성 |
| 화~목 | Founders 30명과 PM 30분 피드백 콜 (Calendly 분산) | PM (2주간 전원 1회 순환) | 정성 수집 |
| 금 | 주간 NPS 설문 (in-app · 10초 소요) | Product | 정량 수집 |
| 금 18:00 | 주간 리포트 발행 (Slack `#thinkad-founders-insights`) | PM | 팀 공유 |

#### 정량 지표 (매주 측정)

- NPS (0~10 점수 · 주관식 이유 1줄)
- 플래너 완주율 (1→7단계)
- 제안서 생성 → 결제 전환율
- 평균 세션 체류 시간 · 재방문율

#### 정성 피드백 카테고리

- "가장 기대했는데 실망한 기능"
- "가장 예상 밖에 좋았던 기능"
- "다음 분기에 꼭 있어야 할 기능"
- "친구에게 추천할 수 있는가 · 왜/왜 안?"

#### 핵심 인사이트 → 로드맵 반영

- 매주 금 18:00 PM이 **Top 3 인사이트**만 선별 → Notion 공개 + 다음 Sprint 백로그 우선순위 조정 회의에 반영
- 3회 이상 동일 피드백 받은 항목은 **Phase 2 로드맵 강제 반영** 룰

### 5.5 졸업 플로우 (베타 종료, 2026-11-07)

- Founders 30명 → **유료 전환 유도**: 3개월 50% 할인 연장 (Founding Customer 특가)
- 성공 사례 3~5건 동의 수집 → 정식 출시 마케팅 자산
- LinkedIn 추천 3~5건 목표

---

## 6. 리스크 & 완화 (이 단계 한정)

> PRD v2 §7.2의 R1~R5는 전체 기간 리스크. 여기는 **Pre-sprint ~ Sprint 3 한정**으로 좁힌 실무 리스크.

| # | 리스크 | 확률 | 영향 | 완화 |
|---|---|---|---|---|
| P1 | Kakao 비즈 계정 승인 지연 → OAuth 개발 블록 | 중 | 중 | Credentials + Google 먼저 출시, Kakao는 W3 합류 대비 |
| P2 | Toss 심사 5영업일 초과 → Sprint 2 결제 테스트 불가 | 중 | 저 | 테스트 키로 Sprint 1~4 개발 완결, 프로덕션 키는 Sprint 5~6에 필요 |
| P3 | 매체사 CSV 200개 수집 지연 (매체본부 인력 부족) | 중 | 높음 | D3부터 영업팀 인턴 1명 지원 · 주말 async 허용 · D7 이후 지연 시 Track C 합류 1주 연기 |
| P4 | Resend DNS 전파 지연 (인증 48h+) | 저 | 중 | D2에 즉시 착수 · 주말 전파 완료 목표 · 실패 시 Sendgrid 백업 계획 |
| P5 | 디자인 1명 인력 부담으로 Track B 지연 | 높음 | 중 | Figma 최종본을 Pre-sprint D4까지 **완성 고정** · 이후엔 FE 1이 shadcn 중심으로 자체 진행 |
| P6 | next-auth v5와 Next.js 16.2.3 app router 비호환 이슈 | 중 | 치명 | Sprint 1 W1 월~화 스파이크 필수 · No-Go 시 자체 세션 (AdminUser 구조 재사용) 즉시 전환 계획 |
| P7 | 베타 Founders 응답률 저조 (< 15명) | 중 | 높음 | 2차·3차 리마인드 + 영업팀 전화 콜드콜 · 예비 10명 리스트 준비 · 최악의 경우 20명으로 시작 |
| P8 | Sprint 1 3주 내 통합 테스트 실패로 Sprint 2 지도 착수 지연 | 저 | 높음 | W3 목요일까지 통합 테스트 통과 못 할 경우 "Sprint 2는 인증 미완 상태로 지도 API만 먼저 착수" 옵션 준비 |

### 6.1 주간 리스크 리뷰 일정

- **Pre-sprint**: D4 (4/24 금) 저녁 30분 · D8 (4/30 목) 저녁 60분
- **Sprint 1~3**: 각 주 금요일 16:00 회고 앞 15분 리스크 스탠드업
- **확률/영향 등급 상향 시**: 즉시 Slack `#thinkad-risks` 채널 공유 + 대표/리드 24시간 내 대응 미팅

### 6.2 Early Warning Dashboard (Pre-sprint 말 구축)

경영진이 매일 아침 10분 이내 확인 가능한 1페이지 대시보드:

- Sprint 진행률 (완료 AC / 전체 AC) — 목표 주당 선형 증가
- 빌드 성공률 (최근 7일) — 목표 98%+
- 매체 데이터 적재율 (목표 1,500행, Pre-sprint 말 기준)
- Founders 확정 수 / 목표 30명 (주간 증가)
- 외부 리드타임 상태 (Kakao · Toss · Resend · Cloudinary · 모두싸인)

---

## 문서 레퍼런스

- **PRD v2**: `docs/THINKAD-HYBRID-PLATFORM-PRD-V2.md`
- **임원 1페이지**: `docs/THINKAD-HYBRID-PLATFORM-PRD-V2-EXECUTIVE-SUMMARY.md`
- **AGENTS.md / CLAUDE.md**: 프로젝트 룰 (`fetchPublicMediaCatalog` DB-backed 유지 · Next.js 16.2.3 breaking change 룰)
- **v1 역사 자료**: `docs/THINKAD-PLATFORM-PRD.md`

---

> **작성일**: 2026-04-20
> **버전**: v1.0 (Pre-sprint ~ Sprint 3 집중)
> **다음 업데이트**: Sprint 1 Kickoff 직전 (2026-04-30) · 모든 체크리스트 재확정
> **담당**: Product Team







