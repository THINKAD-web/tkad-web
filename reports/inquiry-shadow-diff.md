# Inquiry Shadow-mode Diff 리포트

생성: 2026-09-08T10:32:46.308Z

## 요약

- 비교 건수: **6**
- nearly_identical: 0
- both_reasonable: 1
- shadow_better: 5
- shadow_problematic: 0

**Primary 전환 가능:** 예

## 케이스별

### pilot-default — 파일럿 기본 (인천공항 지정 5 SKU + 휴게소 LED)

- 분류: **신규 엔진이 명백히 더 나음**
- mix Jaccard: 67%
- legacy mix (2): cmqrvefua00010ajgb2ra6gal, cmqrvanaa000104kwitn49xax
- shadow mix (3): cmqrvefua00010ajgb2ra6gal, cmqrvanaa000104kwitn49xax, cmrm54gsp000005jv1s4w13bi
- 예산 사용: legacy ₩24,000,000 / shadow ₩27,000,000
- named lock-in 생존: 100%
- 메모: named lock-in 5건 중 shadow mix에 2건만 포함 (예산·CPM 제약) · 다지역·지역 키워드 문의에서 shadow가 더 많은 eligible mix 제안
- recommend top5: 인천공항 T2 센터스퀘어 광고(100), 인천공항 T1 센터 스퀘어 광고(100), 인천공항 T1 웰컴 미디어 (Welcome (100), 인천공항 T1 웰컴 브릿지 (Welcome (100), 인천공항 T2 미디어폴 광고(100)

### four-region-mix — 4개 지역 동시 문의 (서울·부산·대구·인천)

- 분류: **신규 엔진이 명백히 더 나음**
- mix Jaccard: 0%
- legacy mix (0): —
- shadow mix (1): cmo6fei36000004l1m01yef2h
- 예산 사용: legacy ₩0 / shadow ₩18,000,000
- named lock-in 생존: 100%
- 메모: 다지역·지역 키워드 문의에서 shadow가 더 많은 eligible mix 제안
- recommend top5: 인천공항 T1 센터 스퀘어 광고(100), 대구 두류역 두류네거리 광장빌딩 전광판(100), 대구 반월당역 반월당네거리 메디스퀘어 전광판(100), 대구 반고개역 천일빌딩 전광판 광고(100), 대구 서성네거리 전광판 광고(100)

### named-subset-budget — 지정 SKU 2개 + 예산 2,000만

- 분류: **신규 엔진이 명백히 더 나음**
- mix Jaccard: 33%
- legacy mix (1): cmqrvefua00010ajgb2ra6gal
- shadow mix (3): cmqrvefua00010ajgb2ra6gal, cmqrmo26a000f0bkxmar02m9t, cmrm54gsp000005jv1s4w13bi
- 예산 사용: legacy ₩12,000,000 / shadow ₩18,200,000
- named lock-in 생존: 100%
- 메모: 다지역·지역 키워드 문의에서 shadow가 더 많은 eligible mix 제안
- recommend top5: 인천공항 T1 센터 스퀘어 광고(96), 공항철도 계양역 개찰구 래핑 광고(96), 공항철도 검암역 개찰구 래핑 광고(96), 공항철도 인천공항T2역 개찰구 래핑 광고(96), 공항철도 인천공항T1역 개찰구 래핑 광고(96)

### rest-stop-led-only — 휴게소 LED만 (카테고리 확장)

- 분류: **다르지만 둘 다 합리적**
- mix Jaccard: 0%
- legacy mix (0): —
- shadow mix (2): cmox1if98000004l8xl49fghr, cmqk75i0a000h04jpxjru9hpr
- 예산 사용: legacy ₩0 / shadow ₩9,600,000
- named lock-in 생존: 100%
- 메모: mix Jaccard 0% — 구성 차이 큼, shadow recommend top 확인 필요
- recommend top5: 인천 파라다이스시티 쓰리 윈도우 미디어 광고(98), 광주 유스퀘어 기둥 전광판 광고(98), 광주 어등산CC 전광판 광고(98), 대구 두류역 두류네거리 광장빌딩 전광판(98), 인천 송도 A~C동 지하 연결통로 미디어 월(98)

### seoul-subway-national — 서울 지하철 + 전국 인지도

- 분류: **신규 엔진이 명백히 더 나음**
- mix Jaccard: 0%
- legacy mix (0): —
- shadow mix (3): cms7d8drw000x04jlbomogrol, cms8acjaq001g04jxb9udagk4, cmoifvxb6000604jxmw7b3ov7
- 예산 사용: legacy ₩0 / shadow ₩47,100,000
- named lock-in 생존: 100%
- 메모: 다지역·지역 키워드 문의에서 shadow가 더 많은 eligible mix 제안
- recommend top5: 지하철 2호선 삼성역 인피니티로드 광고 (코(120), 지하철 2호선 강남역 아트캔버스 광고(120), 지하철 2호선 강남역 PMP 광고(120), 지하철 2호선 삼성역 엔스퀘어 광고(120), 지하철 2호선 역삼역 맥스비전 광고(120)

### budget-assumed-airport — 예산 미기재 + 인천공항

- 분류: **신규 엔진이 명백히 더 나음**
- mix Jaccard: 67%
- legacy mix (2): cmqrvefua00010ajgb2ra6gal, cmqrvanaa000104kwitn49xax
- shadow mix (3): cmqrvefua00010ajgb2ra6gal, cmqrvanaa000104kwitn49xax, cmqrmo26a000f0bkxmar02m9t
- 예산 사용: legacy ₩24,000,000 / shadow ₩27,200,000
- named lock-in 생존: 100%
- 메모: named lock-in 2건 중 shadow mix에 0건만 포함 (예산·CPM 제약) · 다지역·지역 키워드 문의에서 shadow가 더 많은 eligible mix 제안
- recommend top5: 공항철도 인천공항T2역 개찰구 래핑 광고(96), 공항철도 검암역 디지털사이니지 광고(96), 공항철도 계양역 개찰구 래핑 광고(96), 공항철도 검암역 개찰구 래핑 광고(96), 공항철도 인천공항T1역 개찰구 래핑 광고(96)
