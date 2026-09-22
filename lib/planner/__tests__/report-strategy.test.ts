import assert from "node:assert/strict";
import test from "node:test";
import { buildReportStrategyLines } from "@/lib/planner/report-strategy";

const baseInput = {
  isKo: true,
  goalTitle: "전환 (구매·문의 유도)",
  campaignGoal: "sales" as const,
  industryKey: "indRetail" as const,
  industryText: "유통·리테일",
  regionsText: "서울,부산,대구",
  seoulZones: [],
  followUp: {},
  portfolioCount: 5,
};

test("goalIndustryLine 하드코딩 문구는 실제 매체 위치가 업종 힌트와 일치할 때만 노출된다", () => {
  const lines = buildReportStrategyLines({
    ...baseInput,
    mediaHints: [
      { name: "강남 백화점 앞 전광판", location: "강남 백화점", budgetPct: 100, cpmWon: 1000 },
    ],
  });
  assert.ok(
    lines.some((l) => l.includes("쇼핑·유통 동선과 전환 채널")),
    "매장·백화점 등 리테일 힌트와 일치하면 goalIndustryLine 특화 문구가 나와야 함",
  );
});

test(
  "매체 위치가 업종 힌트와 무관하면(회귀 케이스: 지하철·터널·기차) " +
    "goalIndustryLine 의 미검증 문구가 억제되고 industryStrategyLine 의 검증된 폴백이 대신 나온다",
  () => {
    const lines = buildReportStrategyLines({
      ...baseInput,
      mediaHints: [
        { name: "건대입구역 지하철 7호선 CM보드", location: "건대입구역", budgetPct: 2.5, cpmWon: 292 },
        { name: "천호역 지하철 5호선 CM보드", location: "천호역", budgetPct: 2.5, cpmWon: 389 },
        { name: "부산 마을버스 내부광고", location: "부산", budgetPct: 0.1, cpmWon: 444 },
        { name: "대구 반월당역 환승구간 터널 전광판", location: "대구 반월당역", budgetPct: 17.6, cpmWon: 1111 },
        { name: "KTX 차내 영상 광고", location: "KTX 열차 내", budgetPct: 77.4, cpmWon: 3667 },
      ],
    });
    const joined = lines.join(" ");
    assert.ok(
      !joined.includes("쇼핑·유통 동선과 전환 채널"),
      "지하철·기차역 매체만 있는데 '쇼핑·유통 동선' 을 주장하면 안 됨 (허위 클레임)",
    );
    assert.ok(
      !joined.includes("강남·성수"),
      "선택 매체에 강남·성수가 없으면 해당 지명을 주장하면 안 됨",
    );
    assert.ok(
      lines.some((l) => l === "유통·리테일 업종에 맞춘 매체를 구성했습니다."),
      "검증된 generic 폴백 문구가 대신 나와야 함",
    );
  },
);

test("mediaHints 가 없으면(위치 정보 없음) 검증을 건너뛰고 기존 하드코딩 문구를 그대로 쓴다", () => {
  const lines = buildReportStrategyLines({ ...baseInput, mediaHints: undefined });
  assert.ok(
    lines.some((l) => l.includes("쇼핑·유통 동선과 전환 채널")),
    "위치 정보가 전혀 없으면 기존 동작(무검증)을 유지해야 함 — 회귀 방지",
  );
});
