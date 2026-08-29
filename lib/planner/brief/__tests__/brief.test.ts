import assert from "node:assert/strict";
import test from "node:test";

import {
  SIDO_REGIONS,
  isSidoCode,
  normalizeSidoCodes,
  sidoCodesToBrowseMainIds,
  browseMainIdToSidoCodes,
  summarizeSidoCodes,
} from "../regions.ts";
import {
  EMPTY_BRIEF,
  flightDays,
  totalBudgetWon,
  briefRequiredStatus,
  briefQuickRequiredStatus,
  briefUsesDefaults,
  normalizeBriefInput,
  toCampaignPlanBrief,
  type CampaignBriefInput,
} from "../types.ts";
import {
  parseGenders,
  parseBriefFromText,
  durationToFlight,
} from "../natural-language.ts";

// ── 지역 모델 ──────────────────────────────────────────────

test("17개 시도가 모두 정의된다", () => {
  assert.equal(SIDO_REGIONS.length, 17);
  // 코드 유일성
  const codes = new Set(SIDO_REGIONS.map((r) => r.code));
  assert.equal(codes.size, 17);
});

test("서울·경기 코드 확인", () => {
  assert.ok(isSidoCode("11"));
  assert.ok(isSidoCode("41"));
  assert.ok(!isSidoCode("99"));
  assert.ok(!isSidoCode(""));
});

test("normalizeSidoCodes: 무효 제거 + 표준 순서 정렬", () => {
  // 입력 순서 뒤섞임 → 표준 순서(경기 41 이 부산 26 뒤)로 정렬
  assert.deepEqual(normalizeSidoCodes(["41", "11", "99", "26"]), [
    "11",
    "26",
    "41",
  ]);
  assert.deepEqual(normalizeSidoCodes("11"), ["11"]);
  assert.deepEqual(normalizeSidoCodes(null), []);
});

test("17시도 → browse 그룹 매핑 (충청·경상·전라 병합)", () => {
  // 충북(43)+충남(44)+세종(36) → chungcheong 하나
  assert.deepEqual(sidoCodesToBrowseMainIds(["43", "44", "36"]), [
    "chungcheong",
  ]);
  // 경북(47)+경남(48) → gyeongsang
  assert.deepEqual(sidoCodesToBrowseMainIds(["47", "48"]), ["gyeongsang"]);
  // 서울+경기 → 각각
  assert.deepEqual(sidoCodesToBrowseMainIds(["11", "41"]), ["seoul", "gyeonggi"]);
});

test("browse 그룹 → 17시도 역매핑", () => {
  const chung = browseMainIdToSidoCodes("chungcheong");
  assert.deepEqual(new Set(chung), new Set(["36", "43", "44"]));
  assert.deepEqual(browseMainIdToSidoCodes("seoul"), ["11"]);
});

test("summarizeSidoCodes: 빈 배열=전국, 3개 이상 요약", () => {
  assert.equal(summarizeSidoCodes([], true), "전국");
  assert.equal(summarizeSidoCodes(["11", "41"], true), "서울·경기");
  // 표준 순서 정렬: 11 서울 · 26 부산 · 28 인천 · 41 경기 → 앞 2개
  assert.equal(summarizeSidoCodes(["11", "41", "26", "28"], true), "서울·부산 외 2");
});

// ── 브리프 타입 ────────────────────────────────────────────

test("flightDays: 포함 기준 (같은 날=1일)", () => {
  const b: CampaignBriefInput = {
    ...EMPTY_BRIEF,
    flightStart: "2026-09-01",
    flightEnd: "2026-09-14",
  };
  assert.equal(flightDays(b), 14);
  assert.equal(
    flightDays({ ...EMPTY_BRIEF, flightStart: "2026-09-01", flightEnd: "2026-09-01" }),
    1,
  );
  // 종료 < 시작 → null
  assert.equal(
    flightDays({ ...EMPTY_BRIEF, flightStart: "2026-09-14", flightEnd: "2026-09-01" }),
    null,
  );
});

test("totalBudgetWon: 총액 모드는 그대로, 월예산 모드는 개월 곱", () => {
  const total: CampaignBriefInput = {
    ...EMPTY_BRIEF,
    budgetInputWon: 30_000_000,
    budgetMode: "total",
    flightStart: "2026-09-01",
    flightEnd: "2026-09-14",
  };
  assert.equal(totalBudgetWon(total), 30_000_000);

  // 월예산 3천만, 60일(=2개월) → 6천만
  const monthly: CampaignBriefInput = {
    ...EMPTY_BRIEF,
    budgetInputWon: 30_000_000,
    budgetMode: "monthly",
    flightStart: "2026-09-01",
    flightEnd: "2026-10-30", // 60일
  };
  assert.equal(totalBudgetWon(monthly), 60_000_000);
});

test("필수는 예산·기간뿐", () => {
  assert.deepEqual(briefRequiredStatus(EMPTY_BRIEF), {
    budget: false,
    flight: false,
    ok: false,
  });
  const ok: CampaignBriefInput = {
    ...EMPTY_BRIEF,
    budgetInputWon: 10_000_000,
    flightStart: "2026-09-01",
    flightEnd: "2026-09-14",
  };
  assert.deepEqual(briefRequiredStatus(ok), {
    budget: true,
    flight: true,
    ok: true,
  });
});

test("briefUsesDefaults: 빈 타깃·지역 감지 (전국·전 타깃)", () => {
  const d = briefUsesDefaults(EMPTY_BRIEF);
  assert.deepEqual(d, {
    allRegions: true,
    allGenders: true,
    allAges: true,
    any: true,
  });
  const targeted: CampaignBriefInput = {
    ...EMPTY_BRIEF,
    regionCodes: ["11"],
    genders: ["female"],
    ageBands: ["20s"],
  };
  assert.equal(briefUsesDefaults(targeted).any, false);
});

test("normalizeBriefInput: 손상 입력 방어", () => {
  const raw = {
    budgetInputWon: -5,
    budgetMode: "weird",
    regionCodes: ["11", "99", "41"],
    genders: ["female", "alien"],
    ageBands: ["20s", "teens"],
    goal: "invalid",
    industry: "fb",
    flightStart: 12345,
    freeText: null,
  };
  const n = normalizeBriefInput(raw);
  assert.equal(n.budgetInputWon, 0);
  assert.equal(n.budgetMode, "total");
  assert.deepEqual(n.regionCodes, ["11", "41"]);
  assert.deepEqual(n.genders, ["female"]);
  assert.deepEqual(n.ageBands, ["20s"]);
  assert.equal(n.goal, null);
  assert.equal(n.industry, "fb");
  assert.equal(n.flightStart, null);
  assert.equal(n.freeText, "");
});

test("toCampaignPlanBrief: 빈 타깃은 생략, 예산은 총액 확정", () => {
  const brief: CampaignBriefInput = {
    ...EMPTY_BRIEF,
    budgetInputWon: 30_000_000,
    budgetMode: "total",
    regionCodes: ["11", "41"],
    genders: ["female"],
    ageBands: [],
    goal: "awareness",
    flightStart: "2026-09-01",
    flightEnd: "2026-09-14",
  };
  const plan = toCampaignPlanBrief(brief);
  assert.equal(plan.budgetWon, 30_000_000);
  assert.deepEqual(plan.regionCodes, ["11", "41"]);
  assert.deepEqual(plan.genders, ["female"]);
  assert.equal(plan.ageBands, undefined); // 빈 배열 → 생략
  assert.equal(plan.goal, "awareness");
  assert.equal(plan.flightStart, "2026-09-01");
});

// ── 자연어 파싱 ────────────────────────────────────────────

test("parseGenders: 여성/남성/양쪽", () => {
  assert.deepEqual(parseGenders("2030 여성 타깃").value, ["female"]);
  assert.deepEqual(parseGenders("남성 대상").value, ["male"]);
  assert.deepEqual(parseGenders("남녀 여성 남성 모두").value, []); // 둘 다 → 전 성별
  assert.deepEqual(parseGenders("예산 3천만원").value, []); // 없음
});

test("인수 시나리오: '3천만원 서울경기 2030 여성 2주'", () => {
  const r = parseBriefFromText("3천만원 서울경기 2030 여성 2주");
  // 예산 3천만원
  assert.equal(r.brief.budgetInputWon, 30_000_000);
  assert.ok(r.meta.budget.filled);
  // 서울·경기 → 11, 41
  assert.deepEqual(r.brief.regionCodes, ["11", "41"]);
  // 성별 여성
  assert.deepEqual(r.brief.genders, ["female"]);
  // 20·30대
  assert.deepEqual(new Set(r.brief.ageBands), new Set(["20s", "30s"]));
  // 2주 = 14일
  assert.equal(r.durationDays, 14);
});

test("durationToFlight: 시작 포함 환산", () => {
  const today = new Date(Date.UTC(2026, 8, 1)); // 2026-09-01
  const { flightStart, flightEnd } = durationToFlight(14, today);
  assert.equal(flightStart, "2026-09-01");
  assert.equal(flightEnd, "2026-09-14"); // 14일 포함
});

test("빈 입력은 빈 브리프", () => {
  const r = parseBriefFromText("   ");
  assert.equal(r.brief.budgetInputWon, 0);
  assert.deepEqual(r.brief.regionCodes, []);
  assert.equal(r.durationDays, null);
});

// ── 업종 프리셋 ────────────────────────────────────────────

test("프리셋 풀 ≥3, 무작위 값 아님, 완결 브리프로 환산", async () => {
  const {
    BRIEF_PRESETS,
    BRIEF_PRESET_DISPLAY_COUNT,
    pickBriefPresets,
    presetToBrief,
  } = await import("../presets.ts");
  assert.ok(BRIEF_PRESETS.length >= BRIEF_PRESET_DISPLAY_COUNT);
  const today = new Date(Date.UTC(2026, 8, 1));
  for (const p of BRIEF_PRESETS) {
    const b = presetToBrief(p, today);
    assert.ok(b.budgetInputWon > 0, `${p.id} 예산`);
    assert.ok(b.flightStart && b.flightEnd, `${p.id} 기간`);
    assert.deepEqual(briefRequiredStatus(b).ok, true, `${p.id} 필수 통과`);
  }
  const shuffled = pickBriefPresets(BRIEF_PRESET_DISPLAY_COUNT, 42);
  assert.equal(shuffled.length, BRIEF_PRESET_DISPLAY_COUNT);
  const shuffledAgain = pickBriefPresets(BRIEF_PRESET_DISPLAY_COUNT, 42);
  assert.deepEqual(
    shuffled.map((p) => p.id),
    shuffledAgain.map((p) => p.id),
  );
  // 뷰티 런칭 검산
  const beauty = BRIEF_PRESETS.find((p) => p.id === "beauty-launch");
  assert.ok(beauty);
  const beautyBrief = presetToBrief(beauty!, today);
  assert.equal(beautyBrief.flightStart, "2026-09-01");
  assert.equal(beautyBrief.flightEnd, "2026-09-14");
  assert.deepEqual(beautyBrief.regionCodes, ["11", "41"]);
});

test("신규 프리셋(로컬·대학생·팬덤) — 파라미터 및 빠른 추천 필수값 통과", async () => {
  const { BRIEF_PRESETS, presetToBrief } = await import(
    "@/lib/planner/brief/presets"
  );
  const today = new Date(Date.UTC(2026, 8, 1));

  const local = BRIEF_PRESETS.find((p) => p.id === "local-small-business");
  assert.ok(local, "local-small-business 프리셋 존재");
  const localBrief = presetToBrief(local!, today);
  assert.ok(
    localBrief.budgetInputWon < 15_000_000,
    "로컬 프리셋은 기존 F&B 로컬(1,500만)보다 낮은 예산대",
  );
  assert.deepEqual(localBrief.regionCodes, ["11"]);
  // 빠른 추천은 예산만 필수 — 프리셋이 이를 만족하는지 재확인
  assert.ok(briefQuickRequiredStatus(localBrief).ok);

  const university = BRIEF_PRESETS.find((p) => p.id === "university-students");
  assert.ok(university, "university-students 프리셋 존재");
  const universityBrief = presetToBrief(university!, today);
  assert.deepEqual(universityBrief.ageBands, ["20s"]);
  assert.deepEqual(universityBrief.regionCodes, ["11"]);
  assert.match(
    university!.ko.summary,
    /자세히 설계/,
    "동 단위 세분화 불가 안내가 요약에 포함되어야 한다",
  );
  assert.ok(briefQuickRequiredStatus(universityBrief).ok);

  const fandom = BRIEF_PRESETS.find((p) => p.id === "fandom-support");
  assert.ok(fandom, "fandom-support 프리셋 존재");
  const fandomBrief = presetToBrief(fandom!, today);
  assert.equal(fandomBrief.goal, "awareness");
  assert.equal(fandomBrief.industry, "ent");
  assert.ok(
    fandomBrief.budgetInputWon > universityBrief.budgetInputWon,
    "팬덤은 대학생보다 고예산",
  );
  assert.ok(
    (flightDays(fandomBrief) ?? 0) <= 7,
    "팬덤은 단기 집중 캠페인",
  );
  assert.ok(briefQuickRequiredStatus(fandomBrief).ok);
});

test("PART I — 빠른 추천 프리셋은 예산·지역만 반영하고 자세히 설계 전용 필드는 초기화한다", async () => {
  const { BRIEF_PRESETS, presetToQuickBrief } = await import(
    "@/lib/planner/brief/presets"
  );
  const university = BRIEF_PRESETS.find((p) => p.id === "university-students");
  assert.ok(university);

  const quickBrief = presetToQuickBrief(university!);
  assert.equal(quickBrief.budgetInputWon, university!.base.budgetInputWon);
  assert.deepEqual(quickBrief.regionCodes, university!.base.regionCodes);
  // 대학생 프리셋은 자세히 설계용으로 ageBands=["20s"] 를 갖지만,
  // 빠른 추천엔 그 값을 편집할 입력이 없으므로 조용히 채우지 않는다.
  assert.deepEqual(quickBrief.ageBands, []);
  assert.deepEqual(quickBrief.genders, []);
  assert.equal(quickBrief.goal, null);
  assert.equal(quickBrief.industry, null);
  assert.equal(quickBrief.flightStart, null);
  assert.equal(quickBrief.flightEnd, null);
  assert.ok(briefQuickRequiredStatus(quickBrief).ok);
});

test("O-2 빠른 추천 — 예산만 필수", () => {
  assert.deepEqual(briefQuickRequiredStatus(EMPTY_BRIEF), {
    budget: false,
    ok: false,
  });
  assert.deepEqual(
    briefQuickRequiredStatus({ ...EMPTY_BRIEF, budgetInputWon: 30_000_000 }),
    { budget: true, ok: true },
  );
});
