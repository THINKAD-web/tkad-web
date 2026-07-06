"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bot, MessageCircle, Send, X, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";
import type { AiChatbotMediaCard } from "@/lib/ai-chatbot-tools";
import {
  type AiChatTurn,
  getOrCreateAiChatSessionId,
  loadAiChatFromSession,
  saveAiChatToSession,
} from "@/lib/ai-chatbot-storage";
import { buildPlannerBriefPath } from "@/lib/planner/freetext-brief-url";
import { ChatbotMediaCardBlock } from "@/components/support/chatbot-media-card-block";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
};

type ChatApiResponse = {
  reply?: string;
  media?: AiChatbotMediaCard[];
  remaining?: number;
  limit?: number;
  rateLimited?: boolean;
  maintenance?: boolean;
  message?: string;
  error?: string;
};

type QuotaState = {
  remaining: number;
  limit: number;
};

function Bubble({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  const isUser = role === "user";
  return (
    <div
      className={cn(
        "max-w-[92%] rounded-2xl border px-3 py-2.5 text-sm leading-relaxed",
        isUser
          ? "ml-auto border-violet-400/30 bg-violet-500/20 dark:text-white text-gray-900"
          : "mr-auto dark:border-white/12 border-gray-200 dark:bg-black bg-white/35 dark:text-white text-gray-800",
      )}
    >
      <p className="whitespace-pre-wrap break-words">{content}</p>
    </div>
  );
}

function lastUserTextBefore(messages: AiChatTurn[], assistantIndex: number): string | null {
  for (let i = assistantIndex - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role === "user") return m.content.trim() || null;
  }
  return null;
}

export function SupportAiChatModal({ open, onClose }: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const t = useTranslations("aiChatbot");
  const [messages, setMessages] = useState<AiChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setMessages(loadAiChatFromSession());
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const send = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || loading) return;
      setInput("");
      setError(null);
      const userMsg: AiChatTurn = { role: "user", content: text };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      saveAiChatToSession(nextMessages);
      setLoading(true);
      try {
        const history = messages.map(({ role, content }) => ({ role, content }));
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history,
            locale: isKo ? "ko" : "en",
            sessionId: getOrCreateAiChatSessionId(),
            pageUrl:
              typeof window !== "undefined" ? window.location.href : undefined,
          }),
        });
        const data = (await res.json()) as ChatApiResponse;

        if (data.maintenance) {
          throw new Error(data.reply?.trim() || t("maintenance"));
        }

        if (res.status === 429 || data.rateLimited) {
          throw new Error(data.message?.trim() || t("rateLimited"));
        }

        if (!res.ok) {
          throw new Error(data.error || t("errorGeneric"));
        }

        const reply = data.reply?.trim() || "…";
        const media =
          Array.isArray(data.media) && data.media.length > 0
            ? data.media
            : undefined;

        if (
          typeof data.remaining === "number" &&
          typeof data.limit === "number"
        ) {
          setQuota({ remaining: data.remaining, limit: data.limit });
        }

        const withReply: AiChatTurn[] = [
          ...nextMessages,
          { role: "assistant", content: reply, media },
        ];
        setMessages(withReply);
        saveAiChatToSession(withReply);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("errorGeneric"));
        setMessages(messages);
        saveAiChatToSession(messages);
        setInput(text);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, t, isKo],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[54] dark:bg-black bg-white dark:bg-white/5 bg-gray-500/50 sm:pointer-events-none sm:bg-transparent"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="pointer-events-auto fixed inset-x-3 bottom-3 top-auto z-[56] mx-auto flex max-h-[min(560px,78vh)] min-h-[360px] flex-col overflow-hidden rounded-[24px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white dark:bg-white/5 bg-gray-500 dark:text-white text-gray-900 shadow-[0_28px_120px_rgba(0,0,0,0.7)] backdrop-blur sm:inset-x-auto sm:bottom-6 sm:right-6 sm:left-auto sm:mx-0 sm:w-[min(400px,calc(100vw-2rem))]"
        role="dialog"
        aria-label={t("dialogLabel")}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.1] tkad-neon-grid"
        />
        <div className="relative flex shrink-0 items-center gap-3 border-b dark:border-white/10 border-gray-200 dark:bg-black bg-white/35 px-4 py-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border dark:border-white/14 border-gray-200 dark:bg-white/8 bg-gray-100">
            <Bot className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xs font-medium uppercase tracking-[0.2em] dark:text-white text-gray-500">
              {t("eyebrow")}
            </p>
            <p className="truncate text-sm font-black">{t("title")}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {quota != null
                ? t("remaining", {
                    remaining: quota.remaining,
                    limit: quota.limit,
                  })
                : t("subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 hover:dark:bg-white/10 bg-gray-100"
            aria-label={t("closeAria")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={listRef}
          className="relative min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3"
        >
          {messages.length === 0 && !loading ? (
            <p className="px-2 text-center text-xs dark:text-white text-gray-500">
              {t("emptyState")}
            </p>
          ) : null}
          {messages.map((msg, i) => {
            const showMedia =
              msg.role === "assistant" &&
              Array.isArray(msg.media) &&
              msg.media.length > 0;
            const briefSource = showMedia
              ? lastUserTextBefore(messages, i)
              : null;
            const plannerHref = briefSource
              ? buildPlannerBriefPath(briefSource)
              : null;

            return (
              <div key={`${i}-${msg.role}`} className="space-y-2">
                <Bubble role={msg.role} content={msg.content} />
                {showMedia ? (
                  <div className="mr-auto max-w-[92%] space-y-2">
                    {msg.media!.map((card) => (
                      <ChatbotMediaCardBlock
                        key={card.id}
                        card={card}
                        isKo={isKo}
                      />
                    ))}
                    {plannerHref ? (
                      <Link
                        href={plannerHref}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/35 bg-violet-500/10 px-3 py-2.5 text-xs font-bold text-violet-700 transition-colors hover:bg-violet-500/15 dark:text-violet-200"
                      >
                        {t("plannerCta")}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
          {loading ? (
            <p className="font-display text-xs font-medium uppercase tracking-[0.16em] dark:text-white text-gray-400">
              {t("thinking")}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-100">
              {error}
            </p>
          ) : null}
        </div>

        <div className="relative shrink-0 border-t dark:border-white/10 border-gray-200 dark:bg-black bg-white/30 p-3">
          <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
            {t("suggestionsLabel")}
          </p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {(["suggestion1", "suggestion2", "suggestion3"] as const).map(
              (key) => (
                <button
                  key={key}
                  type="button"
                  disabled={loading}
                  onClick={() => void send(t(key))}
                  className="rounded-lg border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 px-2 py-1 text-[10px] font-bold dark:text-white text-gray-700 hover:dark:bg-white/10 bg-gray-100 disabled:opacity-40"
                >
                  {t(key)}
                </button>
              ),
            )}
          </div>
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={t("placeholder")}
              rows={2}
              disabled={loading}
              className="min-h-[2.75rem] min-w-0 flex-1 resize-none rounded-[16px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/35 px-3 py-2 text-sm dark:text-white text-gray-900 outline-none placeholder:dark:text-white focus:border-white/22"
            />
            <button
              type="button"
              disabled={loading || !input.trim()}
              onClick={() => void send()}
              aria-label={t("send")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border dark:border-white/14 border-gray-200 bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(34,211,238,0.95))] dark:text-white text-gray-900 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <a
            href={KAKAO_CHANNEL_PUBLIC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[16px] border border-[#FEE500]/35 bg-[#FEE500] text-sm font-bold text-[#191600] hover:brightness-105"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            {t("kakaoHandoff")}
          </a>
          <p className="mt-2 text-center font-display text-[9px] uppercase tracking-[0.14em] dark:text-white text-gray-400">
            {t("disclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
}
