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
        "flex w-full flex-col gap-1",
        isUser ? "items-end" : "items-start",
        className,
      )}
    >
      <div
        className={cn(
          "max-w-[min(100%,20rem)] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
          isUser
            ? "rounded-br-md bg-navy text-white"
            : "rounded-bl-md border border-navy/8 bg-slate-100/95 text-navy",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {content}
          </p>
        ) : (
          <div
            className={cn(
              "prose prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed",
              "prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-headings:text-base",
              "prose-headings:font-semibold prose-headings:text-navy prose-strong:text-navy",
              "prose-a:text-navy-dark",
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
