import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { guardInsightMarkdownBoldParticles } from "@/lib/insight-markdown-bold-guard";

function renderMd(markdown: string): string {
  return renderToStaticMarkup(
    ReactMarkdown({ remarkPlugins: [remarkGfm], children: markdown }),
  );
}

function renderGuarded(markdown: string): string {
  return renderMd(guardInsightMarkdownBoldParticles(markdown));
}

test("remark-gfm renders pipe tables as table elements", () => {
  const html = renderMd(`| 항목 | 내용 |
|------|------|
| **지역** | 성수동 |`);
  assert.match(html, /<table/);
  assert.match(html, /<th/);
  assert.doesNotMatch(html, /\|\s*항목\s*\|/);
});

test("remark-gfm renders list markdown", () => {
  const html = renderMd(`**매체 구성**
- 홍대입구역 와이드컬럼 ×4면
- 신촌역 PSD ×16컷`);
  assert.match(html, /<ul/);
  assert.match(html, /홍대입구역/);
});

test("bold guard fixes quote/paren bold followed by Korean particle", () => {
  const samples = [
    '**"매장 반경 500m 안에서 결정하게 만든다"**는 컨셉',
    "**스크린도어 광고(PSD)**와 통로",
    "**'목격되는 광고'**의 필요성",
    "**동영상 소재 송출이 가능한 DOOH(디지털 사이니지)**를 선택",
  ];
  for (const sample of samples) {
    assert.match(renderMd(sample), /\*\*/);
    const html = renderGuarded(sample);
    assert.doesNotMatch(html, /\*\*/);
    assert.match(html, /<strong>/);
  }
});

test("bold guard leaves plain bold+particle unchanged", () => {
  const before = "**지하철 광고**는 테스트";
  assert.equal(guardInsightMarkdownBoldParticles(before), before);
  assert.match(renderGuarded(before), /<strong>지하철 광고<\/strong>는/);
});
