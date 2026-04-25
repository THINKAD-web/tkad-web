"use client";

import ReactMarkdown from "react-markdown";

/**
 * 트렌드 리포트 본문 마크다운 렌더 (PR-5).
 * react-markdown 10.x — 로컬 컴포넌트 매핑으로 한글 가독성 최적화
 * (line-height 1.75, 헤딩 spacing).
 *
 * Client Component 로 분리한 이유: react-markdown 이 내부 React state 사용.
 * 부모 (page.tsx) 는 Server Component 로 SEO/JSON-LD 렌더 유지.
 */
export function InsightMarkdownBody({ markdown }: { markdown: string }) {
  return (
    <div className="prose-insight max-w-none text-navy/90">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="mb-4 mt-8 text-2xl font-extrabold text-navy">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-8 text-xl font-bold text-navy">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-6 text-lg font-bold text-navy">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-3 leading-[1.8] text-navy/85">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-3 list-disc space-y-1.5 pl-6 leading-[1.8] text-navy/85">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 list-decimal space-y-1.5 pl-6 leading-[1.8] text-navy/85">
              {children}
            </ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-4 rounded-r-lg border-l-4 border-gold bg-gold/5 px-4 py-2 italic text-navy/80">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
              className="font-semibold text-gold-dark underline-offset-2 hover:underline"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-navy">
              {children}
            </code>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-navy/10">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-navy/10 bg-slate-50 px-3 py-2 text-left font-bold text-navy">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-navy/5 px-3 py-2 text-navy/85">
              {children}
            </td>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
