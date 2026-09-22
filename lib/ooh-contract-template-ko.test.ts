import assert from "node:assert/strict";
import test from "node:test";
import {
  OOH_CONTRACT_PARTY_B_KO,
  OOH_CONTRACT_TEMPLATE_KO_ARTICLES,
  OOH_CONTRACT_TEMPLATE_KO_SOURCE,
  OOH_CONTRACT_TEMPLATE_SAMPLE_VARS,
  OOH_CONTRACT_TEMPLATE_VARIABLE_MAPPING,
  OOH_CONTRACT_TEMPLATE_VAR_KEYS,
  buildOohContractKoTemplate,
  fillOohContractTemplateText,
  isOohContractTemplateKoSourceComplete,
} from "@/lib/ooh-contract-template-ko";

test("template variable keys match mapping table", () => {
  const mapped = OOH_CONTRACT_TEMPLATE_VARIABLE_MAPPING.map((m) => m.key);
  assert.deepEqual(mapped, [...OOH_CONTRACT_TEMPLATE_VAR_KEYS]);
});

test("party B fixed values match contract signature block", () => {
  assert.equal(OOH_CONTRACT_PARTY_B_KO.companyName, "(주)싱커드");
  assert.equal(OOH_CONTRACT_PARTY_B_KO.representative, "이 재 한");
  assert.equal(
    OOH_CONTRACT_PARTY_B_KO.address,
    "서울특별시 성동구 뚝섬로 17가길 48 11층",
  );
  assert.equal(OOH_CONTRACT_PARTY_B_KO.tel, "02-515-2772");
});

test("source is loaded (not pending)", () => {
  assert.equal(OOH_CONTRACT_TEMPLATE_KO_SOURCE.sourceDocumentPending, false);
  assert.equal(isOohContractTemplateKoSourceComplete(), true);
});

test("template title is 광고계약서", () => {
  const title = OOH_CONTRACT_TEMPLATE_KO_ARTICLES.find((s) => s.kind === "title");
  assert.equal(title?.heading, "광고계약서");
});

test("article sections cover 제1~제11 (제10·11 분리)", () => {
  const articles = OOH_CONTRACT_TEMPLATE_KO_ARTICLES.filter(
    (s) => s.kind === "article",
  );
  assert.equal(articles.length, 11);
  const joined = articles.flatMap((a) => a.paragraphs).join("\n");
  assert.match(joined, /제1조 \(계약의 성립 및 효력\)/);
  assert.match(joined, /제9조 \(자료제공 및 비밀유지\)/);
  assert.match(joined, /제10조 \(재판관할\)/);
  assert.match(joined, /제11조 \(효력발생\)/);
});

test("sample vars round-trip to original spectory case", () => {
  const v = OOH_CONTRACT_TEMPLATE_SAMPLE_VARS;
  const doc = buildOohContractKoTemplate(v);
  const all = doc.sections.flatMap((s) => s.paragraphs).join("\n");
  assert.match(all, /\(주\)스펙토리\(이하"갑"이라한다\)과 \(주\)싱커드/);
  assert.match(all, /이백일십오만육천원정 ￦ 2,156,000\(VAT포함\)/);
  assert.match(all, /이백일십오만육천원정/);
  assert.match(all, /서울특별시 송파구 오금로 185, 4층/);
  assert.match(all, /￦ 2,156,000\(VAT포함\)/);
  assert.match(all, /010-3589-2330/);
  assert.match(all, /대표자 : 최 진 영 \(인\)/);
  assert.match(all, /대표자 : 이 재 한 \(인\)/);
});

test("fillOohContractTemplateText leaves 을 signature fixed", () => {
  const out = fillOohContractTemplateText(
    '"을" 상호 : (주)싱커드 주소 : 서울특별시 성동구 뚝섬로 17가길 48 11층 전화번호 : 02-515-2772 대표자 : 이 재 한 (인)',
    OOH_CONTRACT_TEMPLATE_SAMPLE_VARS,
  );
  assert.match(out, /\(주\)싱커드/);
  assert.match(out, /이 재 한/);
  assert.doesNotMatch(out, /\{\{/);
});

test("matches gear-second reference clauses (제5·7·9)", () => {
  const art5 = OOH_CONTRACT_TEMPLATE_KO_ARTICLES.find((s) =>
    s.heading.startsWith("제5조"),
  );
  assert.match(art5!.paragraphs[0]!, /광고 면은/);
  assert.match(art5!.paragraphs[0]!, /광고안 확인 및 심의/);

  const art7 = OOH_CONTRACT_TEMPLATE_KO_ARTICLES.find((s) =>
    s.heading.includes("계약의중도해지"),
  );
  assert.ok(art7);
  assert.match(art7!.paragraphs[0]!, /광고료는 일할 계산/);
  assert.doesNotMatch(art7!.paragraphs[0]!, /광고 료/);

  const art9 = OOH_CONTRACT_TEMPLATE_KO_ARTICLES.find((s) =>
    s.heading.includes("자료제공"),
  );
  assert.match(art9!.paragraphs[0]!, /상호협조/);
});
