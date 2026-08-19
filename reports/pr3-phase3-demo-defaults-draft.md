# PR-3 Phase 3 — 유형별 기본 demo 프로파일 (승인본)

**상태:** ✅ 재한 승인 (2026-08-19) · `lib/metrics/defaults.ts` 반영 완료  
**용도:** `MediaComputedMetric.demo*` 결손 + `targetAge` 파싱 실패 시 3순위 fallback (`basis: "default"`)

전국 폴백(`NATIONAL_*`) 대비 각 클래스가 **차별화**되어야 스코어링에 의미가 있다.

---

## 성별

| class | male | female | 근거 |
|-------|------|--------|------|
| dooh_large | 54% | 46% | 대로변·고속도로 — 차량 운전자·출장 통행, 운전·장거리 출퇴근 남성 우위 |
| dooh_mid | 47% | 53% | 상권·빌딩 중형 사이니지 — 보행·쇼핑 유동, OOH 보행형 매체 여성 접촉 우위 패턴 |
| subway_psd | 48% | 52% | 역사 PSD — 20~39세 지하철 48%(서울시·KT 2025); 도시 대중교통 여성 +2%p 보수 |
| subway_light | 50% | 50% | 열차·환승통로 — 이동 중 혼합 승객 |
| bus_exterior | 46% | 54% | 한국옥외광고학회 n=800: 버스외부 여성 접촉률 TV 다음·남성보다 높음 |
| bus_shelter | 47% | 53% | 정류장 대기+보행 — 통학·통근·생활 이동 혼합 |
| elevator_tv | 50% | 50% | 포커스미디어·닐슨: Reach ≈ 인구 분포, 성별 쏠림 없음 |
| airport | 48% | 52% | 인천공항 관광 71% + 2024 출국 여성>남성; 출장 13%로 남성 상향 상쇄 |
| static_other | 51% | 49% | 고정형 옥외 — 지역 거주·차량 혼합, 활동인구 남성 소폭 우위 |

---

## 연령

| class | 10s | 20s | 30s | 40s | 50s+ | 근거 |
|-------|-----|-----|-----|-----|------|------|
| dooh_large | 7% | 18% | 26% | **28%** | 21% | 간선·랜드마크 — 40대 자차·통행 peak, 50s+ 전국(48%) 대비 하향 |
| dooh_mid | 10% | **24%** | **28%** | 22% | 16% | 상권·몰 — 2030 체류 편중 |
| subway_psd | 12% | **30%** | **28%** | 18% | 12% | 20~39 지하철 48%; rush 65+ 7.9~9.7% |
| subway_light | 10% | **28%** | 26% | 20% | 16% | PSD 유사, 장거리·공항철도로 40s·50s+ 소폭↑ |
| bus_exterior | **14%** | 26% | 24% | 20% | 16% | 유년기 버스 31%(서울 이동 통계) — 통학 비중 |
| bus_shelter | 11% | 22% | 24% | 22% | 21% | 정류장 — 지하철보다 50s+ 높음 |
| elevator_tv | 8% | 16% | 18% | 20% | **38%** | 아파트·오피스 혼합, TV와 달리 50s+ 과대 없음 |
| airport | 5% | 18% | **32%** | **28%** | 17% | 관광 71%, 2024 3040 출국 적극 |
| static_other | 8% | 16% | 20% | 24% | **32%** | 고정형 — 디지털보다 상주·고령 노출 |

---

## 참고 출처

- [서울시·KT 수도권 생활이동](https://www.khan.co.kr/article/202512030952001) (2025.12)
- [서울 2030세대 통계](https://m.thesegye.com/news/view/1065582134716231)
- [지하철 rush 65+ 7.9~9.7%](https://bravo.etoday.co.kr/view/atc_view/18856)
- [한국옥외광고학회 버스외부 n=800](https://www.xportsnews.com/article/344970)
- [인천공항 행동특성](https://www.khan.co.kr/article/202305240941001)
- [2024 출국 통계](https://www.traveltimes.co.kr/news/articleView.html?idxno=410755)
- [포커스미디어·닐슨 엘리베이터TV](https://www.banronbodo.com/news/articleView.html?idxno=22054)

---

## 검산 — 브리프 "2030 여성" target share

| class | share | 순위 |
|-------|-------|------|
| subway_psd | 30.2% | 1 |
| dooh_mid | 27.6% | 2 |
| bus_exterior / subway_light | 27.0% | 3 |
| airport | 26.0% | 5 |
| static_other | 17.6% | 9 |

성별·연령 조건 변경 시 순위 역전 가능 (3-2 검증 기준).
