import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function renderMd(markdown: string): string {
  return renderToStaticMarkup(
    ReactMarkdown({ remarkPlugins: [remarkGfm], children: markdown }),
  );
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
