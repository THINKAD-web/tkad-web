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
        className="font-medium text-navy-dark underline decoration-gold/70 underline-offset-2"
      >
        {children}
      </a>
    );
  }
  if (href?.startsWith("/")) {
    return (
      <Link
        href={href}
        className="font-medium text-navy-dark underline decoration-gold/70 underline-offset-2"
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
          "max-w-[min(100%,min(20rem,calc(100%-0.25rem)))] rounded-2xl px-3 py-2.5 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.06)] sm:px-3.5 sm:py-2.5",
          isUser
            ? "rounded-br-md bg-gradient-to-br from-navy to-[#0f1c33] text-white ring-1 ring-white/10"
            : "rounded-bl-md border border-navy/[0.09] bg-gradient-to-b from-slate-50 to-slate-100/90 text-navy",
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
              "prose-headings:font-semibold prose-headings:text-navy prose-strong:text-navy",
              "prose-a:text-navy-dark prose-pre:my-2 prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:rounded-lg prose-pre:border prose-pre:border-navy/10 prose-pre:bg-white/80 prose-pre:text-[0.8125rem]",
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
            "px-1 text-[10px] tabular-nums text-navy/40",
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
