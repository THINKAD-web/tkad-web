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
    <div className="prose-insight max-w-none text-bx-black">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="mb-4 mt-8 text-2xl font-bold tracking-tight text-bx-black">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-8 border-b-2 border-bx-black pb-2 text-xl font-bold tracking-tight text-bx-black">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-6 text-lg font-bold tracking-tight text-bx-black">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-3 leading-[1.8] text-bx-black">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-3 list-none space-y-2 pl-0 leading-[1.8] text-bx-black">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 list-decimal space-y-2 pl-6 leading-[1.8] text-bx-black marker:font-mono marker:text-bx-accent">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="flex gap-2">
              <span aria-hidden className="mt-1 inline-block h-1.5 w-1.5 shrink-0 bg-bx-accent" />
              <span className="flex-1">{children}</span>
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-4 border-bx-accent bg-bx-off px-4 py-3 text-bx-black">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
              className="border-b-2 border-bx-black pb-0.5 font-bold text-bx-black transition-colors hover:border-bx-accent hover:text-bx-accent"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="border border-bx-black bg-bx-off px-1.5 py-0.5 font-mono text-[0.9em] text-bx-black">
              {children}
            </code>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto border-2 border-bx-black">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b-2 border-bx-black bg-bx-black px-3 py-2 text-left font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-accent">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-bx-black px-3 py-2 text-bx-black">
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
