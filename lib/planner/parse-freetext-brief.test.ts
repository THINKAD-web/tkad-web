import assert from "node:assert/strict";
import test from "node:test";
import {
  buildScenarioPatchFromFreetextParse,
  parsePlannerFreetextBrief,
} from "@/lib/planner/parse-freetext-brief";

test("parsePlannerFreetextBrief: 강남 2030 브랜딩 3000만원", () => {
  const r = parsePlannerFreetextBrief("강남 2030 브랜딩 3000만원");
  assert.equal(r.fields.campaignGoal.value, "brand");
  assert.equal(r.fields.budgetMan.value, 3000);
  assert.ok(r.fields.regions.value?.includes("seoul"));
  assert.ok(r.fields.seoulZones.value?.includes("gangnam"));
  assert.deepEqual(r.fields.ageKeys.value, ["age20s", "age30s"]);
  assert.equal(r.fields.industryKey.value, null);
  assert.equal(r.fields.months.value, null);
});

test("parsePlannerFreetextBrief: 홍대 MZ 뷰티 런칭 월 500만 3개월", () => {
  const r = parsePlannerFreetextBrief("홍대 MZ 뷰티 런칭 월 500만 3개월");
  assert.equal(r.fields.campaignGoal.value, "launch");
  assert.equal(r.fields.industryKey.value, "indRetail");
  assert.equal(r.fields.budgetMan.value, 500);
  assert.equal(r.fields.months.value, 3);
  assert.ok(r.fields.seoulZones.value?.includes("hongdae"));
});

test("parsePlannerFreetextBrief: 부산 해운대 40대 금융 프로모션 5천만원 분기", () => {
  const r = parsePlannerFreetextBrief("부산 해운대 40대 금융 프로모션 5천만원 분기");
  assert.equal(r.fields.campaignGoal.value, "event");
  assert.equal(r.fields.industryKey.value, "indFinance");
  assert.equal(r.fields.budgetMan.value, 5000);
  assert.equal(r.fields.months.value, 3);
  assert.ok(r.fields.regions.value?.includes("busan"));
  assert.ok(r.fields.ageKeys.value?.includes("age40s"));
});

test("parsePlannerFreetextBrief: 성수 팝업스토어 20대 카페 1억 반년", () => {
  const r = parsePlannerFreetextBrief("성수 팝업스토어 20대 카페 1억 반년");
  assert.equal(r.fields.campaignGoal.value, "event");
  assert.equal(r.fields.industryKey.value, "indFb");
  assert.equal(r.fields.budgetMan.value, 10_000);
  assert.equal(r.fields.months.value, 6);
  assert.ok(r.fields.seoulZones.value?.includes("seongsu"));
});

test("parsePlannerFreetextBrief: 전국 30대 테크 브랜드 인지", () => {
  const r = parsePlannerFreetextBrief("전국 30대 테크 브랜드 인지");
  assert.equal(r.fields.campaignGoal.value, "brand");
  assert.equal(r.fields.industryKey.value, "indTech");
  assert.deepEqual(r.fields.regions.value, ["national"]);
  assert.ok(r.fields.ageKeys.value?.includes("age30s"));
  assert.equal(r.fields.budgetMan.value, null);
});

test("parsePlannerFreetextBrief: 명동 로컬 상권 300만원", () => {
  const r = parsePlannerFreetextBrief("명동 로컬 상권 300만원");
  assert.equal(r.fields.campaignGoal.value, "local");
  assert.equal(r.fields.budgetMan.value, 300);
  assert.ok(r.fields.seoulZones.value?.includes("myeongdong"));
});

test("parsePlannerFreetextBrief: 여의도 직장인 전환 2천만원", () => {
  const r = parsePlannerFreetextBrief("여의도 직장인 전환 2000만원");
  assert.equal(r.fields.campaignGoal.value, "sales");
  assert.equal(r.fields.budgetMan.value, 2000);
  assert.ok(r.fields.seoulZones.value?.includes("yeouido"));
});

test("parsePlannerFreetextBrief: 판교 IT 스타트업 출시 800만", () => {
  const r = parsePlannerFreetextBrief("판교 IT 스타트업 출시 800만");
  assert.equal(r.fields.campaignGoal.value, "launch");
  assert.equal(r.fields.industryKey.value, "indTech");
  assert.equal(r.fields.budgetMan.value, 800);
  assert.ok(r.fields.regions.value?.includes("gyeonggi"));
});

test("parsePlannerFreetextBrief: 제주 관광 이벤트 1년 3천만원", () => {
  const r = parsePlannerFreetextBrief("제주 관광 이벤트 1년 3천만원");
  assert.equal(r.fields.campaignGoal.value, "event");
  assert.equal(r.fields.budgetMan.value, 3000);
  assert.equal(r.fields.months.value, 12);
  assert.ok(r.fields.regions.value?.includes("jeju"));
});

test("parsePlannerFreetextBrief: 20~30대 중심 홍대", () => {
  const r = parsePlannerFreetextBrief("20~30대 중심 홍대");
  assert.ok(r.fields.ageKeys.value?.includes("age20s"));
  assert.ok(r.fields.ageKeys.value?.includes("age30s"));
  assert.ok(r.fields.seoulZones.value?.includes("hongdae"));
  assert.equal(r.fields.campaignGoal.value, null);
});

test("parsePlannerFreetextBrief: 빈 입력", () => {
  const r = parsePlannerFreetextBrief("   ");
  assert.equal(r.fields.campaignGoal.value, null);
  assert.equal(r.unmatchedTokens.length, 0);
});

test("parsePlannerFreetextBrief: 추측 금지 — 목표·예산 없음", () => {
  const r = parsePlannerFreetextBrief("강남에서 광고 하고 싶어요");
  assert.equal(r.fields.campaignGoal.value, null);
  assert.equal(r.fields.budgetMan.value, null);
  assert.ok(r.fields.seoulZones.value?.includes("gangnam"));
});

test("buildScenarioPatchFromFreetextParse: 기본값 보완", () => {
  const r = parsePlannerFreetextBrief("강남 브랜딩");
  const patch = buildScenarioPatchFromFreetextParse(r);
  assert.equal(patch.campaignGoal, "brand");
  assert.ok(patch.regions.includes("seoul"));
  assert.equal(patch.months, 1);
  assert.ok(patch.budgetMan >= 500);
});

test("parsePlannerFreetextBrief: 엔터 콘서트 50대 1500만 2개월", () => {
  const r = parsePlannerFreetextBrief("엔터 콘서트 50대 1500만 2개월");
  assert.equal(r.fields.industryKey.value, "indEnt");
  assert.ok(r.fields.ageKeys.value?.includes("age50plus"));
  assert.equal(r.fields.budgetMan.value, 1500);
  assert.equal(r.fields.months.value, 2);
});

test("parsePlannerFreetextBrief: 을지로 F&B 매출 700만원", () => {
  const r = parsePlannerFreetextBrief("을지로 F&B 매출 700만원");
  assert.equal(r.fields.industryKey.value, "indFb");
  assert.equal(r.fields.campaignGoal.value, "sales");
  assert.equal(r.fields.budgetMan.value, 700);
});

test("parsePlannerFreetextBrief: confidence high on clear budget", () => {
  const r = parsePlannerFreetextBrief("3000만원");
  assert.equal(r.fields.budgetMan.confidence, "high");
  assert.equal(r.fields.budgetMan.value, 3000);
});

// ─── 변형 표현 확장 (튜닝) ─────────────────────────────────────────

test("variant goal: 브랜드 알리고 싶어요 강남역", () => {
  const r = parsePlannerFreetextBrief("브랜드 알리고 싶어요 강남역");
  assert.equal(r.fields.campaignGoal.value, "brand");
  assert.ok(r.fields.seoulZones.value?.includes("gangnam"));
});

test("variant goal: 인지도 높이기 홍대", () => {
  const r = parsePlannerFreetextBrief("인지도 높이기 홍대");
  assert.equal(r.fields.campaignGoal.value, "brand");
});

test("variant goal: 신제품 출시 성수", () => {
  const r = parsePlannerFreetextBrief("신제품 출시 성수");
  assert.equal(r.fields.campaignGoal.value, "launch");
});

test("variant goal: 팝업 행사 할인 홍대입구", () => {
  const r = parsePlannerFreetextBrief("팝업 행사 할인 홍대입구");
  assert.equal(r.fields.campaignGoal.value, "event");
  assert.ok(r.fields.seoulZones.value?.includes("hongdae"));
});

test("variant goal: 세일 → sales, 프로모션 → event", () => {
  assert.equal(
    parsePlannerFreetextBrief("세일 강남").fields.campaignGoal.value,
    "sales",
  );
  assert.equal(
    parsePlannerFreetextBrief("프로모션 강남").fields.campaignGoal.value,
    "event",
  );
});

test("variant goal: 매출 올리기 전환", () => {
  const r = parsePlannerFreetextBrief("매출 올리기 전환");
  assert.equal(r.fields.campaignGoal.value, "sales");
});

test("variant goal: 근처 주민 대상 로컬", () => {
  const r = parsePlannerFreetextBrief("근처 주민 대상 홍대");
  assert.equal(r.fields.campaignGoal.value, "local");
});

test("variant age: MZ세대 2030세대", () => {
  const r = parsePlannerFreetextBrief("MZ세대 2030세대 강남");
  assert.deepEqual(r.fields.ageKeys.value, ["age20s", "age30s"]);
});

test("variant age: Z세대 밀레니얼", () => {
  const r = parsePlannerFreetextBrief("Z세대 밀레니얼 홍대");
  assert.deepEqual(r.fields.ageKeys.value, ["age20s", "age30s"]);
});

test("variant age: 이삼십대 젊은층", () => {
  const r = parsePlannerFreetextBrief("이삼십대 젊은층 성수");
  assert.ok(r.fields.ageKeys.value?.includes("age20s"));
  assert.ok(r.fields.ageKeys.value?.includes("age30s"));
});

test("variant age: 중년 40대", () => {
  const r = parsePlannerFreetextBrief("중년 40대 강남");
  assert.ok(r.fields.ageKeys.value?.includes("age40s"));
});

test("variant age: 시니어 50대", () => {
  const r = parsePlannerFreetextBrief("시니어 50대 명동");
  assert.ok(r.fields.ageKeys.value?.includes("age50plus"));
});

test("variant region: 강남 근처 일대", () => {
  const r = parsePlannerFreetextBrief("강남 근처 일대 브랜딩");
  assert.ok(r.fields.seoulZones.value?.includes("gangnam"));
});

test("variant region: 강남권", () => {
  const r = parsePlannerFreetextBrief("강남권 3000만");
  assert.ok(r.fields.seoulZones.value?.includes("gangnam"));
});

test("variant region: 홍대앞 성수동", () => {
  const r1 = parsePlannerFreetextBrief("홍대앞 뷰티");
  assert.ok(r1.fields.seoulZones.value?.includes("hongdae"));
  const r2 = parsePlannerFreetextBrief("성수동 카페");
  assert.ok(r2.fields.seoulZones.value?.includes("seongsu"));
});

test("variant budget: 삼천만", () => {
  const r = parsePlannerFreetextBrief("삼천만 강남");
  assert.equal(r.fields.budgetMan.value, 3000);
});

test("variant budget: 3천", () => {
  const r = parsePlannerFreetextBrief("3천 강남 브랜딩");
  assert.equal(r.fields.budgetMan.value, 3000);
});

test("variant budget: 3,000만 약 3000만 정도", () => {
  const r1 = parsePlannerFreetextBrief("3,000만 강남");
  assert.equal(r1.fields.budgetMan.value, 3000);
  const r2 = parsePlannerFreetextBrief("약 3000만 정도 홍대");
  assert.equal(r2.fields.budgetMan.value, 3000);
});

test("variant budget: 오백만", () => {
  const r = parsePlannerFreetextBrief("오백만 명동");
  assert.equal(r.fields.budgetMan.value, 500);
});

test("variant months: 석달 세 달 한 달", () => {
  assert.equal(parsePlannerFreetextBrief("석달 강남").fields.months.value, 3);
  assert.equal(parsePlannerFreetextBrief("세 달 홍대").fields.months.value, 3);
  assert.equal(parsePlannerFreetextBrief("한 달 성수").fields.months.value, 1);
});

test("variant months: 6개월간 반기", () => {
  assert.equal(
    parsePlannerFreetextBrief("6개월간 강남").fields.months.value,
    6,
  );
  assert.equal(parsePlannerFreetextBrief("반기 홍대").fields.months.value, 6);
});

test("variant industry: 화장품 코스메틱 스킨케어", () => {
  assert.equal(
    parsePlannerFreetextBrief("화장품 강남").fields.industryKey.value,
    "indRetail",
  );
  assert.equal(
    parsePlannerFreetextBrief("코스메틱 브랜드").fields.industryKey.value,
    "indRetail",
  );
  assert.equal(
    parsePlannerFreetextBrief("스킨케어 런칭").fields.industryKey.value,
    "indRetail",
  );
});

test("variant: 애매한 문장은 여전히 null (추측 금지)", () => {
  const r = parsePlannerFreetextBrief("광고 효과 좋은 매체 추천해줘");
  assert.equal(r.fields.campaignGoal.value, null);
  assert.equal(r.fields.budgetMan.value, null);
  assert.equal(r.fields.regions.value, null);
  assert.equal(r.fields.ageKeys.value, null);
  assert.equal(r.fields.industryKey.value, null);
  assert.equal(r.fields.categories.value, null);
});

// ─── 매체 유형 categories ─────────────────────────────────────────

test("categories: 버스 래핑 → mobile", () => {
  const r = parsePlannerFreetextBrief("버스 래핑 브랜딩 1000만");
  assert.deepEqual(r.fields.categories.value, ["mobile"]);
  assert.equal(r.fields.categories.confidence, "high");
});

test("categories: 버스만 → mobile exclusive", () => {
  const r = parsePlannerFreetextBrief("강남 버스만 1000만");
  assert.deepEqual(r.fields.categories.value, ["mobile"]);
  assert.equal(r.fields.categories.confidence, "high");
});

test("categories: 옥외 빌보드 → static", () => {
  const r = parsePlannerFreetextBrief("옥외 빌보드 브랜딩 2000만");
  assert.deepEqual(r.fields.categories.value, ["static"]);
});

test("categories: 옥외만 → static exclusive", () => {
  const r = parsePlannerFreetextBrief("전국 옥외만 3000만");
  assert.deepEqual(r.fields.categories.value, ["static"]);
});

test("categories: 전광판 LED → digital", () => {
  const r = parsePlannerFreetextBrief("전광판 LED 브랜딩 1500만");
  assert.deepEqual(r.fields.categories.value, ["digital"]);
});

test("categories: 디지털 사이니지만 → digital exclusive", () => {
  const r = parsePlannerFreetextBrief("강남 디지털만 800만");
  assert.deepEqual(r.fields.categories.value, ["digital"]);
});

test("categories: 지하철 단독 → digital+mobile low", () => {
  const r = parsePlannerFreetextBrief("지하철 IT 런칭 500만");
  assert.deepEqual(r.fields.categories.value, ["digital", "mobile"]);
  assert.equal(r.fields.categories.confidence, "low");
});

test("categories: 지하철 광고만 → digital+mobile high", () => {
  const r = parsePlannerFreetextBrief("지하철 광고만 1000만");
  assert.deepEqual(r.fields.categories.value, ["digital", "mobile"]);
  assert.equal(r.fields.categories.confidence, "high");
});

test("categories: 지하철 역사 → digital", () => {
  const r = parsePlannerFreetextBrief("지하철 역사 브랜딩 500만");
  assert.deepEqual(r.fields.categories.value, ["digital"]);
  assert.equal(r.fields.categories.confidence, "high");
});

test("categories: 지하철 차내 → mobile", () => {
  const r = parsePlannerFreetextBrief("지하철 차내 광고 700만");
  assert.deepEqual(r.fields.categories.value, ["mobile"]);
});

test("categories: 택시 래핑 → mobile", () => {
  const r = parsePlannerFreetextBrief("택시 래핑 500만");
  assert.deepEqual(r.fields.categories.value, ["mobile"]);
});

test("categories: 강남 택시 브랜딩 → mobile + brand + gangnam", () => {
  const r = parsePlannerFreetextBrief("강남 택시 브랜딩");
  assert.deepEqual(r.fields.categories.value, ["mobile"]);
  assert.equal(r.fields.campaignGoal.value, "brand");
  assert.ok(r.fields.seoulZones.value?.includes("gangnam"));
});

test("categories: 택시래핑·택시광고·차량·트럭·모빌리티 → mobile", () => {
  for (const phrase of [
    "택시래핑 500만",
    "택시광고 브랜딩",
    "차량 래핑 강남",
    "트럭 광고 1000만",
    "모빌리티 브랜딩",
  ]) {
    const r = parsePlannerFreetextBrief(phrase);
    assert.deepEqual(
      r.fields.categories.value,
      ["mobile"],
      `expected mobile for: ${phrase}`,
    );
  }
});

test("categories: 이동형 → mobile", () => {
  const r = parsePlannerFreetextBrief("이동형 매체 1000만");
  assert.deepEqual(r.fields.categories.value, ["mobile"]);
});

test("categories: 미언급 → null", () => {
  const r = parsePlannerFreetextBrief("강남 브랜딩 3000만원");
  assert.equal(r.fields.categories.value, null);
});

test("buildScenarioPatchFromFreetextParse: categories 파싱 시 덮어씀", () => {
  const r = parsePlannerFreetextBrief("버스만 강남 브랜딩 1000만");
  const patch = buildScenarioPatchFromFreetextParse(r);
  assert.deepEqual(patch.categories, ["mobile"]);
});

test("buildScenarioPatchFromFreetextParse: categories 없으면 전체", () => {
  const r = parsePlannerFreetextBrief("강남 브랜딩");
  const patch = buildScenarioPatchFromFreetextParse(r);
  assert.deepEqual(patch.categories, ["digital", "static", "mobile"]);
});
