"use client";

import ReactMarkdown from "react-markdown";
import { slugifyReportHeading } from "@/lib/report-markdown";

export function ReportMarkdownBody({ markdown }: { markdown: string }) {
  return (
    <div className="prose-insight max-w-none text-foreground">
      <ReactMarkdown
        components={{
          h2: ({ children }) => {
            const text = String(children);
            const id = slugifyReportHeading(text);
            return (
              <h2
                id={id}
                className="scroll-mt-28 mb-3 mt-8 border-b-2 border-border pb-2 text-xl font-bold tracking-tight text-foreground"
              >
                {children}
              </h2>
            );
          },
          h3: ({ children }) => {
            const text = String(children);
            const id = slugifyReportHeading(text);
            return (
              <h3
                id={id}
                className="scroll-mt-28 mb-2 mt-6 text-lg font-bold tracking-tight text-foreground"
              >
                {children}
              </h3>
            );
          },
          p: ({ children }) => (
            <p className="my-3 leading-[1.8] text-foreground">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-3 list-none space-y-2 pl-0 leading-[1.8] text-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 list-decimal space-y-2 pl-6 leading-[1.8] text-foreground marker:font-mono marker:text-accent">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="flex gap-2">
              <span
                aria-hidden
                className="mt-1 inline-block h-1.5 w-1.5 shrink-0 bg-accent"
              />
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
              rel={
                href?.startsWith("http") ? "noopener noreferrer" : undefined
              }
              className="border-b-2 border-border pb-0.5 font-bold text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-foreground">{children}</strong>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
