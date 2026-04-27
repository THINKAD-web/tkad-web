"use client";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { AiChatbotMediaCard } from "@/lib/ai-chatbot-tools";
import { AiChatbotMediaCards } from "@/components/ai-chatbot-inline-media";

type Props = {
  role: "user" | "assistant";
  content: string;
  className?: string;
  media?: AiChatbotMediaCard[];
  isKo?: boolean;
  ts?: number;
};

function formatChatTime(ts: number, isKo: boolean): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString(isKo ? "ko-KR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: !isKo,
    });
  } catch {
    return "";
  }
}

function MdLink({
  href,
  children,
}: {
  href?: string;
  children?: ReactNode;
}) {
  if (href?.startsWith("http://") || href?.startsWith("https://")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="border-b-2 border-bx-black pb-0.5 font-bold text-bx-black transition-colors hover:border-bx-accent hover:text-bx-accent"
      >
        {children}
      </a>
    );
  }
  if (href?.startsWith("/")) {
    return (
      <Link
        href={href}
        className="border-b-2 border-bx-black pb-0.5 font-bold text-bx-black transition-colors hover:border-bx-accent hover:text-bx-accent"
      >
        {children}
      </Link>
    );
  }
  return <span>{children}</span>;
}

export function AiChatbotMessage({
  role,
  content,
  className,
  media,
  isKo = true,
  ts,
}: Props) {
  const isUser = role === "user";
  const timeStr = ts != null ? formatChatTime(ts, isKo) : null;

  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-full flex-col gap-1",
        isUser ? "items-end" : "items-start",
        className,
      )}
    >
      <div
        className={cn(
          "max-w-[min(100%,min(20rem,calc(100%-0.25rem)))] border-2 px-3 py-2.5 text-sm sm:px-3.5",
          isUser
            ? "border-bx-accent bg-bx-accent text-white"
            : "border-bx-black bg-bx-off text-bx-black",
        )}
      >
        {isUser ? (
          <p className="break-words [overflow-wrap:anywhere] whitespace-pre-wrap leading-relaxed">
            {content}
          </p>
        ) : (
          <div
            className={cn(
              "prose prose-sm max-w-none break-words prose-p:my-1 prose-p:leading-relaxed [overflow-wrap:anywhere]",
              "prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-headings:text-base",
              "prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-bx-black prose-strong:text-bx-black",
              "prose-pre:my-2 prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:border-2 prose-pre:border-bx-black prose-pre:bg-bx-white prose-pre:text-[0.8125rem]",
            )}
          >
            <ReactMarkdown
              components={{
                a: ({ href, children }) => (
                  <MdLink href={href}>{children}</MdLink>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
      {timeStr ? (
        <span
          className={cn(
            "px-1 font-mono text-[10px] uppercase tracking-[0.18em] tabular-nums text-bx-gray-dim",
            isUser ? "text-right" : "text-left",
          )}
        >
          {timeStr}
        </span>
      ) : null}
      {!isUser && media && media.length > 0 ? (
        <AiChatbotMediaCards items={media} isKo={isKo} />
      ) : null}
    </div>
  );
}
