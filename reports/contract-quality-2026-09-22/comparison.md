# 계약서 PDF 최종 전수조사 (13건) — QA 2매체 + 제작비 2천만

| # | 항목 | 상태 |
|---|------|------|
| 1 | 전 페이지 상단 영문 헤더 삭제 | ✅ |
| 2 | 수량 매체 수 (`2기`) | ✅ |
| 3 | 제작비 `￦ 20,000,000원(VAT별도)` | ✅ |
| 4 | 총액 `￦ 132,000,000(VAT포함)` | ✅ |
| 5 | 제3조 한글·숫자 총액 연동 | ✅ |
| 6 | 매체별 규격·위치 DB 연동 | ✅ |
| 7 | 매체표 제작비 → 공급가 합계 → VAT → 총액 | ✅ |
| 8 | 제2조 어절 단위 줄바꿈 (`"을"로 하여금`) | ✅ |
| 9 | 제6조 어절 단위 줄바꿈 (`점검해야 한다`) | ✅ |
| 10 | 푸터 `http://www.tkad.co.kr` + 페이지 번호만 | ✅ |
| 11 | 제2·6조 제목만 볼드 | ✅ |
| 12 | 제10·11조+서명란 페이지 브레이크 조정 | ✅ |
| 13 | 제1조 2열 테이블 구분선·값 우측 정렬 | ✅ |

스크린샷: `reference-page-*.png` vs `contract-page-*.png`

```bash
npx tsx scripts/generate-contract-quality-samples.mjs
npx tsx --test lib/contract-money.test.ts lib/ooh-contract-format.test.ts lib/ooh-contract-pdf.test.ts lib/ooh-contract-template-ko.test.ts
```
