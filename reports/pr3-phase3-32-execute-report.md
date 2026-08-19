# PR-3 Phase 3-2 — Demo backfill execute (production)

**상태:** ✅ execute + post-verify 완료  
**실행:** 2026-08-19 · `827 rows updated`

---

## 1. Execute

```bash
npx tsx scripts/backfill-pr3-phase3-demo.mts --execute --allow-prod
```

| 항목 | 결과 |
|------|------|
| 업데이트 | **827** |
| skip | **0** |

---

## 2. Post-verify — basis vs dry-run

| 지표 | dry-run | post-execute | 일치 |
|------|---------|--------------|------|
| `demo_gender_split` filled | 827 | **827** | ✅ |
| `demo_age_split` filled | 827 | **827** | ✅ |
| 값 mismatch | — | **0** | ✅ |
| 성별 basis **default** | 827 | **827** | ✅ |
| 연령 basis **parsed** | 782 | **782** | ✅ |
| 연령 basis **default** | 45 | **45** | ✅ |
| idempotent re-run skip | — | **827** | ✅ |

---

## 3. Phase 1 무손상

| 지표 | HH baseline | post-backfill |
|------|-------------|---------------|
| `contact_rate` filled | 8 | **8** ✅ |
| `sov_share` filled | 8 | **8** ✅ |

8건 매체명·값 유지 (스포애니, 인천 A+ 부평, 강남/사당/교대/신사/혜화역 엔스퀘어, 현대백화점 신촌).

---

## 4. bus_exterior age-default 21건

리포트: [`pr3-phase3-32-bus-exterior-age-default.json`](pr3-phase3-32-bus-exterior-age-default.json)

`targetAge`가 「전 연령」「타겟 맞춤」 등 파싱 불가 텍스트 → class default age profile 적용.

GitHub [#411](https://github.com/THINKAD-web/tkad-web/issues/411) 코멘트 추가 (admin targetAge 등록 관행 참고).

---

## 5. 산출물

- [`pr3-phase3-32-execute-production.json`](pr3-phase3-32-execute-production.json)
- [`pr3-phase3-32-execute-verify.json`](pr3-phase3-32-execute-verify.json)
- [`pr3-phase3-32-bus-exterior-age-default.json`](pr3-phase3-32-bus-exterior-age-default.json)

**다음:** scoring.ts 로직 PR — 별도 지시 대기.
