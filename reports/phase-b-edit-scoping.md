# Phase B — 편집 기능 스코핑 (2026-08-22)

**상태:** 스코핑만 (구현 착수 전)  
**전제:** 계산 신뢰성(A-1/A-1b/Wave 5) 안정화 — 재연결·A-4·A-6과 병행 가능

## 범위 후보 (초안)

| 영역 | 설명 | 선행 의존 |
|------|------|-----------|
| B-1 믹스 수동 편집 UX | Step 2 수량·제거·재정렬, stale/rebuild 정책과 정합 | 5가·5나 완료 |
| B-2 보고서 인라인 편집 | 제목·섹션 노출·라인업 뷰 모드 persist | Wave 5-2~4 |
| B-3 제안서 모드 (Phase C 인접) | PDF/PPT보내기 전 편집 레이어 | CalcEngine 단일 경로 유지 |
| B-4 카탈로그 운영 플래그 | `media-review-status` ABC 6건 워크플로 | A-4 지역 매핑 |

## 비범위 (Phase B 1차)

- `matching-engine` / `scoreMediaCandidates` 스코어링 알고리즘 변경
- A-6 반달·2주 요율 정책 (별도 트랙)
- 6단계 위저드 dead code 삭제

## 검증 기준 (구현 시)

- 편집 후 `calculatePlan` / `buildOohReportPayload` 숫자 불변 또는 명시적 재계산
- 브리프 fingerprint·stale 다이얼로그와 충돌 없음
- 모바일 PublicPageChrome 패딩·SOV 각주 유지

## 권장 순서

1. AI `/recommend` 재연결 + 실사용 검증  
2. A-4 지역 매핑  
3. A-6 2주 프리셋  
4. Wave 5-2~4  
5. Phase B-1 착수
