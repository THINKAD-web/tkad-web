# Phase B 5단계 — D-final 116건 우선순위표 (준비)

- 기준: `reports/phase-b-audit-report-d-final.csv` (impressions > dailyFootfall × 50)
- 조회: 프로덕션 catalog DB read-only (`SET default_transaction_read_only = on`)
- 조회일: 2026-08-21
- **이번 단계에서 flagged / impressions / dailyFootfall 변경 없음**
- 상세 CSV: `reports/phase-b-d-final-priority.csv`

그룹은 배타적이다. 1그룹(비율 상위 20)에 들어가면 카피 불일치가 있어도 2그룹으로 내리지 않는다.

| 그룹 | 건수 | 정의 |
|---|---|---|
| 1 | 20 | 비율 상위 20건 (즉시 검증) |
| 2 | 14 | 1그룹 제외 + 카피/내부 수치 모순 |
| 3 | 82 | 나머지 |
| 합계 | 116 | |

1그룹 안에도 카피/내부 모순 신호가 있는 건 **4건** (그룹은 1 유지, CSV `copyMismatchReasons` 참고).

### 자동 계산 정의

- `dailyFootfallx30` = 저장된 일유동 × 30 (카피의 “월 ○명”과 대조)
- 카피 숫자는 description / effectMemo / priceNote에서 **월 …명** · **하루/일평균 …명**만 추출. 가격(만원·원), 구좌, 송출 횟수(회)는 제외.
- 상대 오차 10% 이내면 일치.
- D 리스트 정의상 **impressions는 항상 daily×50을 초과**하므로, impressions ≠ daily×30인 것은 전건 해당. 그룹 2 조건으로 쓰지 않음.
- 추가 내부 모순: `price === impressions`(가격=노출 카운트), `cpm ≤ 10`(placeholder 의심).

### hasProposal (점검 결과 재사용)

| | 건수 |
|---|---|
| hasProposal=true | 8 |
| hasProposal=false, 갤러리/URL에 제안서형 파일 있음 | 6 |
| hasProposal=false, 제안서형 파일 없음 | 102 |

3단계와 같이 `hasProposal=false`만 보고 “제안서 없다”고 단정하지 말 것. 갤러리 JPEG(파일명에 제안서)를 먼저 볼 것.

### flagged 상태 (미변경 확인)

| reviewStatus | 건수 |
|---|---|
| flagged | 3 |
| clean | 113 |
| reviewed | 0 |

이번 스크립트는 SELECT만 수행. **116건의 reviewStatus를 쓰지 않음.**

이미 Phase B 6건(A/B/C)에 들어 있는 D-final 교집합 **3건** — 5단계 신규 검증보다 3단계 트랙이 우선.

- 지하철 2호선 메트로라이브 광고 (`cmp3biu21000004l8a8ijkh9c`) reviewStatus=flagged reason=subway_monthly_cap
- 인천공항 T1 Center Bridge (`cmozef5v4000404l21zc780sn`) reviewStatus=flagged reason=subway_monthly_cap
- 지하철 신분당선 메트로 라이브 광고 (`cmp3csmb2000004l43sen816g`) reviewStatus=flagged reason=subway_monthly_cap

---

## 1그룹 — 비율 상위 20 (즉시 검증)

3단계와 동일: 세일즈/원본 대조 → A/B/C. 이 표는 판정이 아님.

| 순위 | 매체 | ID | 월노출 / 일유동 | 비율 | daily×30 | 카피월 vs ×30 | 모순 신호 | hasProposal / 파일 | reviewStatus |
|---|---|---|---|---|---|---|---|---|---|
| 1 | NC 다이노스 메인 전광판 광고 | `cmoyjxgn5000004lepbkbec5l` | 8,500,000 / 12,000 | ×708.33 | 360,000 | 카피숫자없음 | — | false / 없음(0) | clean |
| 2 | 지하철 2호선 메트로라이브 광고 | `cmp3biu21000004l8a8ijkh9c` | 45,000,000 / 130,000 | ×346.15 | 3,900,000 | 불일치 | 카피월≠daily×30;price=impressions | false / 있음(4) | flagged |
| 3 | 골프장 미디어바 광고 | `cmp3v92yy000004jr7i6ykgy1` | 2,850,000 / 8,500 | ×335.29 | 255,000 | 카피숫자없음 | — | false / 없음(0) | clean |
| 4 | 대구 국제공항 국내선 2층 격리대합실 사각기둥 광고 | `cmp0s58ou000404kty3ncswwp` | 1,600,000 / 7,200 | ×222.22 | 216,000 | 카피숫자없음 | — | false / 없음(0) | clean |
| 5 | 대구 국제공항 카트 광고 | `cmp0s2i8b000004jxap4ok8ci` | 1,800,000 / 8,500 | ×211.76 | 255,000 | 카피숫자없음 | — | false / 없음(0) | clean |
| 6 | 스크린골프 미디어 (Screengolf) 광고 | `cms4vn593000404jo50pv0lmb` | 14,139,000 / 70,000 | ×201.99 | 2,100,000 | 카피숫자없음 | — | false / 없음(0) | clean |
| 7 | 인천공항 T1 Center Bridge | `cmozef5v4000404l21zc780sn` | 20,000,000 / 110,000 | ×181.82 | 3,300,000 | 카피숫자없음 | cpm≤10(placeholder) | false / 없음(0) | flagged |
| 8 | 대구 국제공항 도착장 멀티비전 광고 | `cmp0s5qz9000404jxxq1ve1su` | 2,200,000 / 12,500 | ×176 | 375,000 | 카피숫자없음 | — | false / 없음(0) | clean |
| 9 | 분당선 압구정로데오역 헬로 로데오 DS 광고 | `cmqp7sr5k000004jpyzaczfao` | 6,500,000 / 38,000 | ×171.05 | 1,140,000 | 불일치 | 카피월≠daily×30 | false / 없음(0) | clean |
| 10 | 시청 근원빌딩 전광판 광고 | `cmp65rrot000004jx2o87isb3` | 8,500,000 / 50,000 | ×170 | 1,500,000 | 카피숫자없음 | — | false / 없음(0) | clean |
| 11 | 금호 고속버스 외부 광고 | `cmp3uwie0000204lbw1zmrp2l` | 18,500,000 / 120,000 | ×154.17 | 3,600,000 | 카피숫자없음 | — | false / 없음(0) | clean |
| 12 | 광주 유스퀘어 기둥 전광판 광고 | `cmqi6xjgq000604jj5krliihl` | 18,000,000 / 120,000 | ×150 | 3,600,000 | 카피숫자없음 | — | false / 없음(0) | clean |
| 13 | 대구 국제공항 국내선 1층 전광판 광고 | `cmp0s4prw000204ktul6suaow` | 1,800,000 / 12,000 | ×150 | 360,000 | 카피숫자없음 | — | false / 없음(0) | clean |
| 14 | 대구 국제공항 2층 출발장 보안검색 바구니 광고 | `cmp0s3jby000204jxwc3kgllo` | 1,200,000 / 8,500 | ×141.18 | 255,000 | 카피숫자없음 | — | false / 없음(0) | clean |
| 15 | 블루스퀘어 미디어 광고 | `cmptf5nk9000004lebz3i8yv9` | 1,200,000 / 8,500 | ×141.18 | 255,000 | 카피숫자없음 | — | true / 있음(1) | clean |
| 16 | 신세계백화점 본점 신세계 스퀘어 전광판 광고 | `cmo5zgtqk000004l8s594fn51` | 4,500,000 / 33,414 | ×134.67 | 1,002,420 | 카피숫자없음 | 카피일≠dailyFootfall | false / 없음(0) | clean |
| 17 | 여수 메가박스 전광판 광고 | `cmpc9yuwa000004l8blx83uyn` | 1,800,000 / 14,200 | ×126.76 | 426,000 | 카피숫자없음 | — | false / 없음(0) | clean |
| 18 | 샤롯데시어터 디지털사이니지 광고 | `cmpthegrq000004lb9iccjkho` | 1,500,000 / 12,000 | ×125 | 360,000 | 카피숫자없음 | — | true / 있음(1) | clean |
| 19 | 양양고속도로 가평휴게소 미디어 광고 | `cmptgcp8w000004lcetwqulfq` | 2,200,000 / 18,000 | ×122.22 | 540,000 | 카피숫자없음 | — | true / 있음(1) | clean |
| 20 | 스타필드 고양점 미디어타워 & 파노라마 스크린 광고 | `cmokcw7on000204jso0xml0r3` | 8,500,000 / 70,000 | ×121.43 | 2,100,000 | 카피숫자없음 | — | false / 없음(0) | clean |

골프장 미디어바(`cmp3v92yy000004jr7i6ykgy1`, 순위 3)는 D ×50 리스트에 남아 있으나, 이전 감사에서 **분류 오류(subway_psd)** 가능성이 기록됨. 값 이상치와 분류 이슈를 구분해 볼 것.

---

## 2그룹 — 카피/내부 모순 (14건, 1그룹 제외)

원본 대조 전에도 카피·저장값이 안 맞는 신호. 1그룹 처리 경험을 보고 자동화 후보로 넘길 예정.

- ×120 KTX 전주역 맞이방 영상광고 (4번) 광고 (`cmrx2jg0z001n04jr751ualgm`) — cpm≤10(placeholder) ; 카피추출: (없음)
- ×92.86 스타필드 하남점 LED 전광판 광고 (`cmokcli51000004l19rum9jwj`) — cpm≤10(placeholder) ; 카피추출: 일평균 7만 명→70,000 | 일평균 7만 명→70,000
- ×65.79 디저트랩 이마트24 서울숲점 LED 사이니지 광고 (`cms4dt5b8000404l4ze7pd4em`) — price=impressions ; 카피추출: (없음)
- ×57.14 인천지하철 1호선 원인재역 디지털사이니지 (디지털포스터) 광고 (`cmp0gjlox000m04ib37h33kgd`) — cpm≤10(placeholder) ; 카피추출: (없음)
- ×57.14 인천지하철 1호선 작전역 디지털사이니지 (디지털포스터) 광고 (`cmp0gg9e3000e04jicm5nl221`) — cpm≤10(placeholder) ; 카피추출: (없음)
- ×56.92 인천지하철 1호선 부평역 디지털사이니지 (디지털포스터) 광고 (`cmp0gi5je000g04jile8iqnr5`) — cpm≤10(placeholder) ; 카피추출: (없음)
- ×56.92 인천지하철 1호선 인천시청역 I-SCREEN 영상광고 (`cmrwgei4j000b04lat8caj53b`) — cpm≤10(placeholder) ; 카피추출: (없음)
- ×56.82 인천지하철 1호선 예술회관역 디지털사이니지 (디지털포스터) 광고 (`cmp0gd45o000c04ji4usu8p0e`) — cpm≤10(placeholder) ; 카피추출: (없음)
- ×56.82 인천지하철 2호선 검암역 I-SCREEN 영상광고 (`cmrwfuh1b000g04lghb3kaxkg`) — cpm≤10(placeholder) ; 카피추출: (없음)
- ×56.8 인천지하철 1호선 테크노파크역 I-SCREEN 영상광고 (`cmrwfnosu000m04laknk1lk46`) — cpm≤10(placeholder) ; 카피추출: (없음)
- ×56.74 인천지하철 2호선 주안역 I-SCREEN 영상광고 (`cmrwg26u0000104l20ofjcxkk`) — cpm≤10(placeholder) ; 카피추출: 일평균 5.5만명→55,000
- ×56.72 인천지하철 1호선 디지털사이니지 전체 턴키 (7개 역사) 광고 (`cmrwirjcs000504jlnlr684lo`) — cpm≤10(placeholder) ; 카피추출: (없음)
- ×56.67 인천지하철 1호선 인천터미널역 디지털사이니지 (디지털포스터) 광고 (`cmrwib77h000m04l28pi9b6ro`) — cpm≤10(placeholder) ; 카피추출: (없음)
- ×56.25 인천지하철 1호선 부평구청역 디지털사이니지 (디지털포스터) 광고 (`cmp0geb4p000i04ibjncqsfya`) — cpm≤10(placeholder) ; 카피추출: (없음)

---

## 3그룹 — 나머지 82건

비율 ×50 초과이지만 카피에서 월/일 숫자를 못 뽑았거나, 뽑은 숫자가 daily×30(또는 일유동)과 10% 안이다. **정상 확정이 아님.** 1·2그룹 이후에 순차 검증.

CSV에서 `group=3` 필터.

---

## 하지 않은 것

- flagged 적용 / reviewed 전환
- impressions · dailyFootfall 수정
- classifyForMetricsWrite 수정
- 제안서 파일 내용 열람
