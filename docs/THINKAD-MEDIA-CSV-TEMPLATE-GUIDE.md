# 매체사 CSV 정리용 엑셀 템플릿 + 작성 가이드

> **목적**: Pre-sprint 10일 내 기존 거래 매체사 **200곳 · 매체 1,500~2,000면**을 플랫폼 기반 데이터로 확보
> **중요도**: **리스크 R5 (재고 부족) 완화 핵심 과제** — 베타 출시 성패의 70%가 이 작업에 달려 있음
> **대상**: 매체본부 3인 + 영업팀 인턴 1명 + BE 엔지니어 1 (지원)
> **기간**: 2026-04-23 목 ~ 2026-04-28 화 (6일)
> **산출물**: `thinkad-media-masterlist-v1` Google Sheets → CSV → DB 적재
> **기반 모델**: Prisma `Media` · `MediaOwner` 스키마 (PRD v2 §5 참조)

---

## 목차

1. [엑셀 컬럼 구조 (필수 + 선택)](#1-엑셀-컬럼-구조)
2. [각 컬럼별 작성 가이드](#2-각-컬럼별-작성-가이드)
3. [데이터 품질 검증 체크리스트](#3-데이터-품질-검증-체크리스트)
4. [작업 순서 4단계 (실전 플로우)](#4-작업-순서-4단계)
5. [실무 팁 & Google Sheets 활용법](#5-실무-팁--google-sheets-활용법)
6. ["검증 배지 Pending" 전략 (Phase 1 노출)](#6-검증-배지-pending-전략)

---

## 1. 엑셀 컬럼 구조

### 1.1 시트 구성 (Google Sheets 2개 탭)

| 탭 | 용도 | 행 수 예상 |
|---|---|---|
| **Tab 1: `media_owners`** | 매체사(사업자) 마스터 | 200행 |
| **Tab 2: `medias`** | 개별 매체(면) 마스터 | 1,500~2,000행 |

> ✅ **2개 분리 이유**: 한 매체사(예: 부산미디어)가 240면을 운영 → 매체사는 1행, 매체는 240행. 사업자등록번호·연락처는 한 번만 입력.

---

### 1.2 Tab 1: `media_owners` (매체사 마스터, 총 12열)

| # | 컬럼명 (한글) | 컬럼명 (코드) | 필수 | 타입·제약 | 예시 |
|---|---|---|---|---|---|
| 1 | 매체사 ID | `owner_external_id` | ✅ | `OWN-001` 형식 | `OWN-BSN-001` |
| 2 | 회사명 | `company_name` | ✅ | 한글·20자 이내 | (주)부산미디어 |
| 3 | 사업자등록번호 | `business_number` | ✅ | `XXX-XX-XXXXX` | 605-81-12345 |
| 4 | 대표자명 | `ceo_name` | ✅ | 한글 | 이동철 |
| 5 | 담당자명 | `contact_name` | ✅ | 한글 | 박영희 |
| 6 | 담당자 직책 | `contact_title` | — | 자유 | 영업팀장 |
| 7 | 연락처 (전화) | `contact_phone` | ✅ | `010-XXXX-XXXX` | 051-1234-5678 |
| 8 | 연락처 (이메일) | `contact_email` | ✅ | 이메일 형식 | sales@busanmedia.co.kr |
| 9 | 본사 주소 | `address_road` | ✅ | 도로명 주소 | 부산 동구 중앙대로 206 |
| 10 | 운영 지역 | `operating_regions` | ✅ | 쉼표 구분 | 부산,울산 |
| 11 | 최초 거래 연도 | `first_contract_year` | — | YYYY | 2022 |
| 12 | 비고 | `notes` | — | 자유 | 비수기 공실 문의 자주 함 |

---

### 1.3 Tab 2: `medias` (매체 마스터, 총 18열)

| # | 컬럼명 (한글) | 컬럼명 (코드) | 필수 | 타입·제약 | 예시 |
|---|---|---|---|---|---|
| 1 | 매체 ID | `media_external_id` | ✅ | `BUS-BSN-SHT-001` | `BUS-BSN-SHT-042` |
| 2 | 매체사 ID (FK) | `owner_external_id` | ✅ | Tab 1 참조 | OWN-BSN-001 |
| 3 | 매체명 (국문) | `name_ko` | ✅ | 한글·50자 이내 | 부산역 2번출구 버스쉘터 A면 |
| 4 | 매체 유형 | `category` | ✅ | enum (아래 참조) | `bus_shelter` |
| 5 | 디지털 여부 | `is_digital` | ✅ | `true`/`false` | false |
| 6 | 주소 (도로명) | `address_road` | ✅ | 도로명 주소 | 부산 동구 중앙대로 206 |
| 7 | 주소 (상세) | `address_detail` | — | 자유 | 2번 출구 38m 지점 |
| 8 | 위도 | `latitude` | ⚠️ (지오코딩 후) | 소수점 6자리 | 35.115123 |
| 9 | 경도 | `longitude` | ⚠️ (지오코딩 후) | 소수점 6자리 | 129.041234 |
| 10 | 크기 (면적 ㎡) | `size_sqm` | — | 숫자 | 2.0 |
| 11 | 해상도 (DOOH만) | `resolution` | — | `1920x1080` | — |
| 12 | 운영 시간 | `operating_hours` | — | `00-24` / `06-23` | 00-24 |
| 13 | **기본 단가 (월, KRW)** | `price_base_monthly` | ✅ | 숫자 (만원 금지, 원 단위) | 1200000 |
| 14 | 가용 시작일 | `available_from` | — | YYYY-MM-DD | 2026-06-01 |
| 15 | 가용 종료일 | `available_to` | — | YYYY-MM-DD | 2027-05-31 |
| 16 | 검증 상태 | `verification_status` | ✅ | `pending` / `verified` | pending |
| 17 | 사진 URL (쉼표 구분) | `photo_urls` | — | https:// URL | https://.../1.jpg,https://.../2.jpg |
| 18 | 비고 | `notes` | — | 자유 | 야간 조도 확인 필요 |

**`category` enum 8종 (통일 필수)**

| 값 | 의미 |
|---|---|
| `billboard` | 빌보드 (옥상·옥외 대형 간판) |
| `bus_shelter` | 버스쉘터 |
| `subway` | 지하철 역사 내 |
| `bus_exterior` | 버스 외부 |
| `taxi` | 택시 상단·측면 |
| `dooh` | 디지털 옥외 (LED·LCD) |
| `elevator` | 엘리베이터 (아파트·빌딩) |
| `wallscape` | 벽면 대형 래핑 |

---

### 1.4 전체 컬럼 요약

- **필수 컬럼 (반드시 채워야 함)**: Tab 1 → 8개 / Tab 2 → 7개
- **지오코딩 후 자동 채워짐**: 위도·경도 (BE 스크립트가 Kakao Local API로 자동)
- **선택 컬럼 (있으면 좋음, 없어도 등록 가능)**: 그 외 전부

**원칙**
- 필수 컬럼 누락 행은 **업로드 시 자동 거부** (`.env.example` 배포 시 dry-run 리포트로 즉시 확인)
- 선택 컬럼 공란은 **허용**, 나중에 매체사가 직접 입력 (Phase 3 포털)

---

## 2. 각 컬럼별 작성 가이드

### 2.1 매체사 ID (`owner_external_id`)

- **형식**: `OWN-{지역코드}-{순번}` (예: `OWN-BSN-001`, `OWN-SEL-042`)
- **지역코드**: SEL(서울) · BSN(부산) · DGU(대구) · ICN(인천) · GWJ(광주) · DJN(대전) · 기타 KOR
- **출처**: 매체본부가 직접 부여 (기존 시스템 ID가 없으므로 **신규 작성**)
- **실수 회피**: 순번은 3자리 zero-pad (`001`, `042` O · `1`, `42` X) — 나중 정렬 오류 방지

### 2.2 사업자등록번호 (`business_number`)

- **형식**: `XXX-XX-XXXXX` (대시 포함 12자)
- **출처**: 기존 계약서 상단 · 세금계산서 상단
- **실수 회피**:
  - 공백 제거 필수 (엑셀 `=SUBSTITUTE(A1," ","")`)
  - 중복 체크: 같은 번호 = 같은 매체사 (Tab 1에서 중복 검사 필수)
  - PIPA 민감 정보 → 공유 시 **사내망 전용**

### 2.3 매체 ID (`media_external_id`)

- **형식**: `{유형코드}-{지역코드}-{부가}-{순번}` (예: `BUS-BSN-SHT-042`)
- **유형코드**: BLB(billboard) · BUS(bus_shelter) · SUB(subway) · DOO(dooh) · TAX(taxi) · ELE(elevator) · WAL(wallscape)
- **출처**: 매체본부가 체계 수립 후 일괄 부여
- **실수 회피**: 한번 부여한 ID는 **절대 재사용 금지** (삭제된 매체 ID도 재활용 X — 이력 추적용)

### 2.4 매체명 국문 (`name_ko`)

- **형식**: `{지역} {구체위치} {유형} {세부}` (예: "부산역 2번출구 버스쉘터 A면")
- **출처**: 기존 계약서 "매체 표기" 항목 · 매체사 영업 자료
- **실수 회피**:
  - "강남 빌보드" 같은 **모호한 이름 금지** — 꼭 2~3 단계로 구체화
  - 같은 매체사의 여러 면은 A면·B면·C면 식으로 구분
  - 특수문자 최소화 (`/` `·` `-`만 허용)

### 2.5 매체 유형 (`category`)

- **출처**: 매체본부 기존 분류 → 8개 enum 중 매핑
- **매핑 예시 (기존 용어 → enum)**
  - "쉘터" / "정류장" → `bus_shelter`
  - "옥상간판" / "빌보드" → `billboard`
  - "LED전광판" / "디지털사이니지" → `dooh`
  - "아파트모니터" → `elevator`
  - "건물래핑" → `wallscape`
- **실수 회피**: 한 매체가 **애매한 경우** 해당 행의 `notes`에 원래 용어 기록 → 추후 BE가 재분류

### 2.6 주소 (`address_road`) — **가장 중요한 컬럼**

- **형식**: **도로명 주소 (지번 주소 금지)**
- **출처**:
  - 1순위: 계약서 매체 주소
  - 2순위: 매체사 제공 "매체 위치도"
  - 3순위: 현장 담당자에게 **네이버 지도 URL 받아 도로명 변환**
- **실수 회피**:
  - ❌ "강남역 사거리" (불명확)
  - ✅ "서울 강남구 테헤란로 152" (명확)
  - 도로명 없는 외곽은 위도/경도 수동 입력 + `notes`에 "지번 주소 사용" 표기

### 2.7 위도·경도 (`latitude` · `longitude`)

- **채움 방식**: **지오코딩 스크립트가 자동 채움** (작업 3단계에서 BE가 실행)
- **매체본부 작업 시**: **비워두면 됨** (단, 도로명 주소가 정확해야 자동 변환 성공)
- **실패 시 처리**: Dry-run 리포트에 `error_column=address_road` 표시 → 매체본부 수동 교정
- **수동 입력 시**: 네이버 지도에서 핀 클릭 → 좌측 정보 "좌표" 복사 (소수점 6자리)

### 2.8 기본 단가 (`price_base_monthly`) — **단위 통일 필수**

- **단위**: 원(KRW), **숫자만** (콤마·만원·백만 금지)
  - ❌ `1,200,000`, `120만원`, `1.2M`
  - ✅ `1200000`
- **출처**: 계약서 월 단가 · 매체사 최근 견적서
- **실수 회피**:
  - **혼동 #1**: 일 단가 ↔ 월 단가 — 계약서 확인 후 월 환산 (일×30)
  - **혼동 #2**: 광고비 ↔ 매체비 — **매체비만** (대행 수수료·제작비 제외)
  - **혼동 #3**: VAT 포함 ↔ 제외 — **VAT 제외 금액** 입력 통일

### 2.9 가용 시작·종료일 (`available_from` · `available_to`)

- **형식**: `YYYY-MM-DD`
- **출처**: 매체사 최근 공실 현황 자료
- **모르면 공란**: Phase 1에서 매체사 포털 오픈 후 매체사 직접 갱신 (Phase 3)

### 2.10 검증 상태 (`verification_status`)

- **Pre-sprint에는 전부 `pending`** 으로 입력
- **예외**: 매체본부가 선정한 **시드 30곳만 `verified`** (D6 작업)
- 자세한 "Pending" 전략은 **§6** 참조

### 2.11 사진 URL (`photo_urls`)

- **형식**: 쉼표 구분 URL (최대 5개)
- **출처**:
  - 1순위: 매체본부 보유 Dropbox·Google Drive 사진
  - 2순위: 매체사 영업 자료 PDF 추출
- **처리**: Pre-sprint에 **Cloudinary 업로드 → URL 획득** (BE 스크립트가 일괄 업로드, `thinkad/media/` 폴더)
- **공란 허용**: Sprint 1~2에 매체사 연락하여 사진 보강

---

## 3. 데이터 품질 검증 체크리스트

> **3단계 검증**: ① 입력 중 실시간 검증 (Google Sheets 함수) → ② 업로드 전 dry-run 리포트 → ③ 업로드 후 샘플링 QA

### 3.1 실시간 검증 (Google Sheets 데이터 검증 규칙)

| 컬럼 | 검증 규칙 | Google Sheets 설정 |
|---|---|---|
| `business_number` | 12자리 + 대시 2개 | 사용자정의 수식: `=REGEXMATCH(A2,"^\d{3}-\d{2}-\d{5}$")` |
| `contact_email` | 이메일 형식 | 데이터 > 데이터 검증 > "유효한 이메일 주소" |
| `contact_phone` | 전화 형식 | `=REGEXMATCH(G2,"^0\d{1,2}-\d{3,4}-\d{4}$")` |
| `category` | 8개 enum만 | 데이터 검증 > 목록에서 선택 |
| `is_digital` | true/false | 데이터 검증 > 목록: `true, false` |
| `price_base_monthly` | 양수·정수 | 데이터 검증 > 숫자 > 보다 큼 0 |
| `verification_status` | pending/verified | 데이터 검증 > 목록 |
| `available_from` | 2026-01-01 이후 | 데이터 검증 > 날짜 |

### 3.2 위도·경도 정확도 검증

**지오코딩 후 자동 검증 (BE 스크립트)**

- ✅ 위도 `33~39` · 경도 `124~132` 범위 내인가 (한국 경계)
- ✅ 입력 주소의 도시 `동/구`와 역지오코딩 결과의 `동/구`가 일치하는가

**수동 스팟 검증 (매체본부 20곳 샘플링)**

- Google Sheets에서 `=HYPERLINK("https://map.kakao.com/link/map/"&C2&","&H2&","&I2, C2)` 함수로 **원클릭 지도 확인 링크** 생성
- 20곳 랜덤 샘플 육안 확인 (매체본부 30분)
- 편차 >100m 건은 **수동 교정** 필수

### 3.3 가격 단위 통일 검증

**일괄 검증 공식 (Google Sheets)**

```
=IF(M2<10000, "❌ 단위 의심 (만원?)", 
  IF(M2>100000000, "❌ 단위 의심 (억?)", "✅ OK"))
```

- M열이 `price_base_monthly`라면 위 공식을 Z열에 적용 → 1만원 미만 또는 1억 초과 매체 자동 표시
- 실제 1만원 미만 매체는 극히 드묾 (대부분 단위 실수)

### 3.4 중복 매체 제거

**Step 1: 매체사 중복** (Tab 1)

- `business_number` 중복 검사:
  ```
  =COUNTIF(C:C, C2)
  ```
  - 값이 `2` 이상이면 중복. 하나만 남기고 삭제.

**Step 2: 매체 중복** (Tab 2)

- 같은 `owner_external_id` + `address_road` + `category` 조합이 중복이면 동일 매체 의심:
  ```
  =COUNTIFS(B:B,B2, F:F,F2, D:D,D2)
  ```
  - `2` 이상 → 매체본부 확인 후 면 구분자(`A면`·`B면`) 추가하거나 삭제

**Step 3: 유사 매체명** (오타 의심)

- Levenshtein 거리 기반 유사도 체크 (Google Apps Script로 커스텀 함수 생성 — §5 참조)

### 3.5 필수 컬럼 누락 검증

**Google Sheets 조건부 서식으로 빨간 배경**

- 각 필수 컬럼이 비었을 때 해당 셀 빨간색 자동 표시:
  ```
  = A2=""
  → 배경색: 빨강
  ```
- 팀 누구나 스크롤하면서 빨간 셀만 채우면 됨

---

## 4. 작업 순서 4단계

### 📅 6일 스케줄 (D3 목 ~ D8 목)

```
D3 (4/23 목) ───┐
D4 (4/24 금)    │ Step 1: 기존 데이터 추출·입력
D5 (4/27 월)   ─┘
D6 (4/28 화)   ─── Step 2: 지오코딩 + Step 3: 검증 배지 시드 30곳
D7 (4/29 수)   ─── Step 4: 최종 검증
D8 (4/30 목)   ─── DB 업로드 + 샘플 QA
```

---

### Step 1: 기존 계약서·명함에서 데이터 추출 (D3~D5, 3일)

**목표**: Google Sheets 마스터 시트에 **200매체사 + 1,500~2,000매체 행** 입력 완료

**담당 배정 (매체본부 3인 + 영업팀 인턴 1명)**

| 담당 | 작업 범위 | 매체사 수 | 매체 수 |
|---|---|---|---|
| 매체본부 A (본부장) | 수도권 매체사 (서울·경기·인천) | 80곳 | 700면 |
| 매체본부 B (실사팀장) | 영남 매체사 (부산·대구·울산·경남) | 60곳 | 500면 |
| 매체본부 C (영업팀장) | 호남·충청·강원 매체사 | 40곳 | 350면 |
| 영업팀 인턴 | 전체 데이터 검증·중복 제거·오타 수정 보조 | — | — |

**데이터 소스 우선순위**

1. **계약서 (PDF/스캔)** — 가장 정확 (매체명·주소·단가·면적)
2. **매체사 영업 자료** (PDF) — 사진·위치도·운영시간
3. **명함·카카오톡 기록** — 연락처·담당자
4. **매체본부 내부 엑셀 시트** — 기존 누적 데이터
5. **네이버/카카오 지도** — 주소 확정 (도로명 변환)

**실무 작업 방법**

- 계약서 PDF를 Google Drive `thinkad-contracts/` 폴더에 업로드
- 각 계약서에서 15분 내 5개 매체 정보 추출 가능 목표
- 애매한 항목은 `notes` 컬럼에 "확인 필요" 표기 → 매체본부 상호 검토

**일일 진도 체크 (매일 18:00)**

| 날짜 | 목표 매체사 누적 | 목표 매체 누적 |
|---|---|---|
| D3 종료 | 70곳 | 500면 |
| D4 종료 | 140곳 | 1,100면 |
| D5 종료 | 200곳 | 1,500면+ |

---

### Step 2: 지오코딩 — 위도/경도 자동 변환 (D6 오전, 4시간)

**담당**: BE 엔지니어 1 + 매체본부 전원 (오류 교정 대기)

**스크립트 실행 흐름**

```
1. Google Sheets → CSV export (medias 탭)
2. scripts/geocode-media-csv.ts 실행
   - 입력: address_road 컬럼
   - 호출: Kakao Local API (https://dapi.kakao.com/v2/local/search/address.json)
   - 출력: latitude · longitude 컬럼 자동 채움
3. 실패 건을 별도 시트 `geocode_errors.csv`로 export
```

**지오코딩 실패 유형별 대응**

| 에러 유형 | 예시 | 대응 |
|---|---|---|
| 주소 오타 | "테헤라로 152" | 매체본부 수정 재실행 |
| 도로명 없음 | 지번 주소만 존재 | 지번 API로 대체 호출 (자동) |
| 외곽·신축 | 새 도로 미등재 | 네이버 지도 핀 → 좌표 직접 입력 |
| 모호한 위치 | "OO역 근처" | 매체사에 연락하여 정확 주소 받기 |

**품질 목표**

- 지오코딩 성공률 **95%+**
- 실패 5% (100건 이하)는 **D6 오후 매체본부 수동 교정**

---

### Step 3: 검증 배지 초기값 부여 (D6 오후 ~ D7, 1.5일)

**3-단계 부여 정책**

| 매체 등급 | 매체 수 | `verification_status` 값 | 이유 |
|---|---|---|---|
| **Tier A — Verified 시드** | 30곳 | `verified` | 매체본부 기존 실사 기록 + 사진 4장+ 보유 |
| **Tier B — Pending** | ~1,470곳 | `pending` | 주소·기본 정보는 확보, 실사 미완 |
| **Tier C — 보류** | 나머지 | (업로드 제외) | 핵심 정보 누락 (주소·단가 등) → 매체본부 보강 후 Phase 2 재등록 |

**Tier A 시드 30곳 선정 기준** (D6 매체본부 회의)

- 최근 12개월 내 집행 실적 있음
- 매체본부 현장 방문 사진 최소 4장 보유 (입지·가시성·조도·경쟁 각 1장)
- 4단계 검증 점수 우선 기록 가능 (대략적 점수 0~5)

**시드 30곳 배지 데이터 입력 (별도 시트 `verification_seeds.csv`)**

| 컬럼 | 예시 |
|---|---|
| `media_external_id` | BUS-SEL-SHT-001 |
| `location_score` | 5 |
| `visibility_score` | 5 |
| `illumination_score` | 4 |
| `competition_score` | 3 |
| `total_score` | 17 |
| `tier` | gold |
| `verifier_name` | 박실사 (THINKAD 현장실사팀) |
| `verified_at` | 2026-04-28 |
| `expires_at` | 2026-10-28 (6개월) |
| `photos_json` | `["url1","url2","url3","url4"]` |

---

### Step 4: CSV 업로드 전 최종 검증 (D7 ~ D8 오전)

**체크리스트**

#### Tab 1 (매체사) 검증
- [ ] 필수 8개 컬럼 공란 0건
- [ ] 사업자등록번호 중복 0건
- [ ] 이메일·전화 형식 오류 0건
- [ ] 총 행 수 180~220행 (200곳 ±10%)

#### Tab 2 (매체) 검증
- [ ] 필수 7개 컬럼 공란 0건
- [ ] `owner_external_id`가 Tab 1에 존재하는지 VLOOKUP 검증
- [ ] `category` enum 외 값 0건
- [ ] `price_base_monthly` 1만~1억 범위 외 0건
- [ ] 중복 매체 (같은 owner+주소+category) 0건
- [ ] 위도·경도 한국 경계 내
- [ ] 총 행 수 1,350~2,000행

#### Dry-run 업로드 (D8 오전)
- [ ] `scripts/import-media-csv.ts --dry-run` 실행
- [ ] 리포트에 "ERROR" 라인 0건
- [ ] 샘플 20건 DB 조회 테스트

#### 실제 업로드 (D8 오후)
- [ ] Staging DB 먼저 반영 (`scripts/import-media-csv.ts --target=staging`)
- [ ] 매체본부 20건 샘플 육안 확인 (매체명·주소·가격·좌표)
- [ ] Prod DB 반영 (`--target=prod`)
- [ ] 업로드 완료 보고서 Slack `#thinkad-presprint` 공유

---

## 5. 실무 팁 & Google Sheets 활용법

### 5.1 200곳을 6일 안에 정리하는 5가지 팁

#### 💡 팁 1. "복사·붙여넣기 매크로화" — 계약서 PDF에서 OCR 추출
- Adobe Acrobat / ChatGPT-4 Vision / Google Docs OCR 중 택 1
- 계약서 PDF 드래그 → OCR → 텍스트 → Google Sheets 컬럼에 분리 붙여넣기
- 10분에 5개 매체 추출 가능 (손 입력 대비 3배 빠름)

#### 💡 팁 2. "매체사별 일괄 입력" — 하나의 매체사 240면을 20분에
- Tab 2에 첫 매체 한 행 완전히 입력
- `Ctrl+D` (아래로 복사) → 240행 생성
- 바뀌는 컬럼만 수정: `media_external_id` 순번, `name_ko` 면 번호, `address_detail`
- 공통 컬럼 (owner_id·category·price·is_digital)은 복사본 그대로 유지

#### 💡 팁 3. "매체 ID 자동 생성 함수"
```
// A열: 유형코드, B열: 지역코드, C열: 부가코드, D열: 순번
=A2 & "-" & B2 & "-" & C2 & "-" & TEXT(D2, "000")
// 결과: BUS-BSN-SHT-042
```

#### 💡 팁 4. "진도율 대시보드" — 매체본부 실시간 경쟁
- 별도 탭 `progress_dashboard` 생성
- 각 담당자의 완료 행 수를 `COUNTIF` 집계
- 목표 대비 % 색상 표시 (조건부 서식)
- 매일 18:00 스탠드업 전 5분 확인 → 지연 담당자에게 인턴 투입

#### 💡 팁 5. "모르는 건 무조건 `notes`에 기록"
- 애매·의심되는 항목 **삭제하지 말고** `notes`에 "확인 필요: 단가 단위" 같이 기록
- D6 매체본부 공동 회의에서 `notes` 전체 스크롤하며 일괄 해소
- 혼자 끙끙대면 200곳 시간 초과 확정

---

### 5.2 Google Sheets 핵심 함수 모음

#### 중복 찾기
```
=COUNTIF(C:C, C2) > 1
```
→ TRUE면 중복, 조건부 서식으로 노란 배경

#### 필수 값 누락 찾기
```
=COUNTBLANK(A2:L2)
```
→ 필수 12개 컬럼 중 빈 개수 표시

#### VLOOKUP: 매체 → 매체사 매칭
```
=VLOOKUP(B2, 'media_owners'!A:B, 2, FALSE)
```
→ Tab 2의 `owner_external_id`가 Tab 1에 존재하면 회사명 반환, 없으면 `#N/A`

#### 지도 원클릭 확인 (검증용)
```
=HYPERLINK("https://map.kakao.com/link/map/" & C2 & "," & H2 & "," & I2, "🗺️ 지도")
```
→ 클릭하면 카카오맵 새 창 오픈 (C2=매체명, H2=위도, I2=경도)

#### 가격 단위 이상치 탐지
```
=IF(M2<10000, "❌ 단위?", IF(M2>100000000, "❌ 억대?", "✅"))
```

#### 주소 정규화 (공백·특수문자 제거)
```
=TRIM(SUBSTITUTE(SUBSTITUTE(F2, "  ", " "), " ,", ","))
```

#### 전화번호 자동 포매팅
```
=REGEXREPLACE(G2, "(\d{2,3})(\d{3,4})(\d{4})", "$1-$2-$3")
```

---

### 5.3 Google Apps Script 3종 (생산성 극대화)

**Tools > Apps Script** 에 붙여넣기 후 저장·승인

#### Script 1: 유사 매체명 오타 감지 (Levenshtein)
```javascript
function LEVENSHTEIN(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++)
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i-1] === a[j-1]
        ? matrix[i-1][j-1]
        : Math.min(matrix[i-1][j-1]+1, matrix[i][j-1]+1, matrix[i-1][j]+1);
    }
  return matrix[b.length][a.length];
}
```
→ 시트에서 `=LEVENSHTEIN(C2, C3)` 2 이하면 오타 의심

#### Script 2: 매체 ID 자동 할당 (순번 자동)
```javascript
function NEXT_MEDIA_ID(type, region, detail) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('medias');
  const prefix = `${type}-${region}-${detail}-`;
  const data = sheet.getRange('A:A').getValues().flat().filter(v => v.startsWith(prefix));
  const next = String(data.length + 1).padStart(3, '0');
  return prefix + next;
}
```

#### Script 3: Kakao 지오코딩 테스트 (검증용)
```javascript
function KAKAO_GEOCODE(address) {
  const key = 'YOUR_REST_KEY';  // BE 리드에게 요청
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;
  const res = UrlFetchApp.fetch(url, { headers: { Authorization: `KakaoAK ${key}` } });
  const doc = JSON.parse(res.getContentText()).documents[0];
  return doc ? `${doc.y},${doc.x}` : 'FAIL';
}
```
→ 매체본부가 20건 샘플 `=KAKAO_GEOCODE(F2)` 돌려 주소 정확도 사전 검증

---

## 6. 검증 배지 Pending 전략

### 6.1 왜 Pending을 별도 상태로 노출하는가

**문제**: Pre-sprint에 실사 완료 30곳 + 주소만 확보 1,470곳. 후자를 "없는 것"으로 처리하면 베타에서 매체 부족.

**해결 원칙**
- **존재하지만 "검증 미완"임을 명시적으로 표기**
- 광고주가 선택적으로 "Verified Only"로 숨길 수 있음 (**D1 필터**)
- 매체사·광고주 **양쪽 모두에게 검증 요청 기능** 제공 → Phase 2 검증 파이프라인 자연 유입

### 6.2 Pending 매체 노출 정책 (Phase 1 베타)

| 표시 위치 | Verified (30곳) | Pending (~1,470곳) |
|---|---|---|
| 매체 카드 | 🛡️ **4/4 GOLD** (황금) | ⚪ **검증 진행 중** (회색) |
| 기본 검색 결과 | 포함 | 포함 |
| `/media?verifiedOnly=true` | 포함 | **제외** |
| 매체 상세 페이지 | 배지 상세 리포트 노출 | "검증 요청 가능" CTA 노출 |
| 제안서 PDF | 🛡️ 워터마크 · 매체 행에 배지 | 회색 뱃지 + 부록에 "이 매체는 검증 진행 중" |
| 플래너 AI 추천 | 우선 추천 | 근거 데이터 부족 시 제외 (Claude 판단) |

### 6.3 Pending → Verified 전환 플로우

**광고주 측 CTA**: 매체 상세에 "🔍 이 매체의 현장 검증 요청하기" 버튼
- 클릭 → 매체본부 Slack `#verification-requests` 알림 + CrmAccount 생성
- 48시간 내 매체본부 "실사 가능 여부 + 예상 리드타임" 회신

**매체사 측 CTA** (Phase 3 포털 오픈 후): 매체사가 자진 "검증 신청" → THINKAD 실사팀 방문 → 배지 부여

**Phase 2 Sprint 10 Admin UI**: `/admin/medias/[id]/verification`에서 4항목 점수 입력 시 자동 배지 산출 (PRD v2 §2.2 F2.4)

### 6.4 Pending 매체의 심리적 장벽 완화 문구

베타 출시 시 매체 카드·상세에 노출할 문구 후보:

- "이 매체는 THINKAD가 **현장 검증을 준비 중**입니다."
- "기본 정보는 매체사가 직접 제공했으며, **4단계 실사는 진행 예정**입니다."
- "[검증 요청하기] 버튼으로 우선 실사를 요청하실 수 있습니다."

**디자인 원칙**
- Verified는 **황금 톤**, Pending은 **은색 중성 톤** — 계층 시각화
- Pending이 부정적으로 보이지 않게 "진행 중" 네거티브 이모지 금지
- `/media?verifiedOnly=true` 토글을 **검색 Hero에 기본 노출** → 사용자가 원할 때 300곳만

### 6.5 Pending 물량 목표 진행률 (Phase 2 종료 시점)

| 시점 | Verified | Pending | 전환률 |
|---|---|---|---|
| Pre-sprint 말 | 30곳 | 1,470곳 | 2% |
| Phase 1 베타 (8/7) | 50곳 | 1,450곳 | 3% |
| Phase 2 Sprint 10 (9월) | 500곳 | 1,000곳 | 33% |
| Phase 2 정식 (11/6) | 2,000곳 | 500곳 (+신규 매체) | 80%+ |

**전환 가속 장치**
- 매체본부 실사 월 150곳 목표 (Phase 2 데이터 엔지니어 합류 후 자동화 보조)
- 매체사에게 "Verified 배지 획득 매체는 월 예약 전환율 +30%" 데이터로 자진 검증 요청 유도

---

## 📎 참고 자료 & 산출물 링크

- **PRD v2**: `docs/THINKAD-HYBRID-PLATFORM-PRD-V2.md` (Prisma Media·MediaOwner·MediaVerificationBadge 스키마)
- **실행 계획**: `docs/THINKAD-EXECUTION-PLAN-PRESPRINT-TO-SPRINT3.md` (§1.3 CSV 방법론)
- **킥오프 발표**: `docs/THINKAD-KICKOFF-PRESENTATION-10MIN.md`
- **Google Sheets 템플릿**: `thinkad-media-masterlist-v1` (D3 4/23 생성 예정)
- **BE 스크립트**: `scripts/import-media-csv.ts` · `scripts/geocode-media-csv.ts` (Pre-sprint에 BE 작성)
- **Slack 채널**: `#thinkad-presprint` (일일 Async) · `#verification-requests` (Pending → Verified 전환)

---

> **작성일**: 2026-04-20 · **버전**: v1.0
> **사용 기간**: 2026-04-23 ~ 2026-04-30 (Pre-sprint D3~D8)
> **담당**: 매체본부 3인 + 영업팀 인턴 1명 + BE 엔지니어 1 (지원)
> **완료 목표**: 2026-04-30 목 18:00 — 200매체사 · 1,500+ 매체 DB 적재 + 검증 배지 30곳 시드



