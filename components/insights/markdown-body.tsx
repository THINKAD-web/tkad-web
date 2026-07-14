"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { guardInsightMarkdownBoldParticles } from "@/lib/insight-markdown-bold-guard";

/**
 * 트렌드 리포트 본문 마크다운 렌더 (PR-5).
 * react-markdown 10.x — remark-gfm 으로 GFM 테이블·취소선 등 지원.
 * 로컬 컴포넌트 매핑으로 한글 가독성 최적화 (line-height 1.75, 헤딩 spacing).
 *
 * Client Component 로 분리한 이유: react-markdown 이 내부 React state 사용.
 * 부모 (page.tsx) 는 Server Component 로 SEO/JSON-LD 렌더 유지.
 */
export function InsightMarkdownBody({ markdown }: { markdown: string }) {
  const normalizedMarkdown = guardInsightMarkdownBoldParticles(markdown);

  return (
    <div className="prose-insight max-w-none text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-4 mt-8 text-2xl font-bold tracking-tight text-foreground">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-8 border-b-2 border-border pb-2 text-xl font-bold tracking-tight text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-6 text-lg font-bold tracking-tight text-foreground">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-3 leading-[1.8] text-foreground">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-3 list-none space-y-2 pl-0 leading-[1.8] text-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 list-decimal space-y-2 pl-6 leading-[1.8] text-foreground marker: marker:text-accent">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="flex gap-2">
              <span aria-hidden className="mt-1 inline-block h-1.5 w-1.5 shrink-0 bg-accent" />
              <span className="flex-1">{children}</span>
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-4 border-accent bg-muted px-4 py-3 text-foreground">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
              className="border-b-2 border-border pb-0.5 font-bold text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">
              {children}
            </code>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto border-2 border-border">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b-2 border-border bg-hero-void px-3 py-2 text-left font-display text-xs font-medium uppercase tracking-[0.18em] text-accent">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border px-3 py-2 text-foreground">
              {children}
            </td>
          ),
        }}
      >
        {normalizedMarkdown}
      </ReactMarkdown>
    </div>
  );
}
