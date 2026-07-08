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
  assert.equal(OOH_CONTRACT_PARTY_B_KO.address, "서울 성동구 뚝섬로17가길 48");
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

test("article sections cover 제1~제11 (제10·11 동일 단락)", () => {
  const articles = OOH_CONTRACT_TEMPLATE_KO_ARTICLES.filter(
    (s) => s.kind === "article",
  );
  assert.equal(articles.length, 10);
  const joined = articles.flatMap((a) => a.paragraphs).join("\n");
  assert.match(joined, /제1조 \(계약의 성립 및 효력\)/);
  assert.match(joined, /제9조 \(자료 제공 및 비밀유지\)/);
  assert.match(joined, /제10조 \(재판관할\)/);
  assert.match(joined, /제11조 \(효력발생\)/);
});

test("sample vars round-trip to original spectory case", () => {
  const v = OOH_CONTRACT_TEMPLATE_SAMPLE_VARS;
  const doc = buildOohContractKoTemplate(v);
  const all = doc.sections.flatMap((s) => s.paragraphs).join("\n");
  assert.match(all, /\(주\)스펙토리 \(이하"갑"이라한다\)과 \(주\)싱커드/);
  assert.match(all, /교보문고에 사이니지 광고/);
  assert.match(all, /2026년 07월 06일 - 2026년 08월 05일 \(1개월\)/);
  assert.match(all, /₩ 2,156,000원 \(VAT포함\)/);
  assert.match(all, /2026년 6월 29일/);
  assert.match(all, /대표이사 : 최 진 영 \(인\)/);
  assert.match(all, /대표이사 : 이 재 한 \(인\)/);
});

test("fillOohContractTemplateText leaves 을 signature fixed", () => {
  const out = fillOohContractTemplateText(
    '"을" 상호 : (주)싱커드 주소 : 서울 성동구 뚝섬로17가길 48 전화번호 : 02-515-2772 대표이사 : 이 재 한 (인)',
    OOH_CONTRACT_TEMPLATE_SAMPLE_VARS,
  );
  assert.match(out, /\(주\)싱커드/);
  assert.match(out, /이 재 한/);
  assert.doesNotMatch(out, /\{\{/);
});

test("preserves original typos and spacing (광고 료, 판단하 고)", () => {
  const art7 = OOH_CONTRACT_TEMPLATE_KO_ARTICLES.find(
    (s) => s.heading === "제7조 (계약의 중도해지)",
  );
  assert.ok(art7);
  const text = art7!.paragraphs[0]!;
  assert.match(text, /광고 료/);
  assert.match(text, /판단하 고/);
  assert.match(text, /지급한 다/);
});
