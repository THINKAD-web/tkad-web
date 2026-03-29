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
};

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
        className="font-medium text-gold underline underline-offset-2"
      >
        {children}
      </a>
    );
  }
  if (href?.startsWith("/")) {
    return (
      <Link
        href={href}
        className="font-medium text-gold underline underline-offset-2"
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
}: Props) {
  const isUser = role === "user";
  return (
    <div
      className={cn(
        "flex w-full flex-col",
        isUser ? "items-end" : "items-start",
        className,
      )}
    >
      <div
        className={cn(
          "max-w-[min(100%,20rem)] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
          isUser
            ? "bg-navy text-white"
            : "border border-navy/10 bg-white text-navy",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{content}</p>
        ) : (
          <div
            className={cn(
              "prose prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed",
              "prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-headings:text-base",
              "prose-headings:font-semibold prose-headings:text-navy prose-strong:text-navy",
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
      {!isUser && media && media.length > 0 ? (
        <AiChatbotMediaCards items={media} isKo={isKo} />
      ) : null}
    </div>
  );
}
