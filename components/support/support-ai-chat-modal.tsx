"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
import {
  buildPlannerBriefPath,
  buildRecommendBriefPath,
} from "@/lib/planner/freetext-brief-url";
import { ChatbotMediaCardBlock } from "@/components/support/chatbot-media-card-block";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
};

type ChatApiResponse = {
  reply?: string;
  media?: AiChatbotMediaCard[];
  recommendDeeplink?: string | null;
  plannerDeeplink?: string | null;
  remaining?: number;
  limit?: number;
  rateLimited?: boolean;
  maintenance?: boolean;
  message?: string;
  error?: string;
  engine?: "rule" | "claude";
  tokensUsed?: number;
  free?: boolean;
};

const ANALYZE_MIN_MS = 480;
const LINK_INLINE_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

function ChatReplyText({ content }: { content: string }) {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of content.matchAll(LINK_INLINE_RE)) {
    const index = match.index ?? 0;
    if (index > last) {
      nodes.push(content.slice(last, index));
    }
    const label = match[1] ?? "";
    const href = match[2] ?? "";
    if (href.startsWith("/")) {
      nodes.push(
        <Link
          key={`lnk-${key++}`}
          href={href}
          className="font-semibold text-violet-600 underline underline-offset-2 dark:text-violet-300"
        >
          {label}
        </Link>,
      );
    } else {
      nodes.push(match[0]);
    }
    last = index + match[0].length;
  }
  if (last < content.length) nodes.push(content.slice(last));
  return <p className="whitespace-pre-wrap break-words">{nodes}</p>;
}

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
      {isUser ? (
        <p className="whitespace-pre-wrap break-words">{content}</p>
      ) : (
        <ChatReplyText content={content} />
      )}
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
  const [claudeQuota, setClaudeQuota] = useState<QuotaState | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 모바일 키보드가 올라오면 시각 뷰포트가 줄어든다 — 그 줄어든 만큼 시트를
  // 끌어올려 입력창이 키보드 뒤에 가려지지 않게 한다. 데스크톱(sm: 코너 카드)엔
  // 영향 없음 — visualViewport 는 키보드가 없으면 항상 0을 낸다.
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const isMobileLayout = () => window.matchMedia("(max-width: 639px)").matches;
    const update = () => {
      if (!isMobileLayout()) {
        setKeyboardInset(0);
        return;
      }
      const inset = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      setKeyboardInset(inset);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setKeyboardInset(0);
    };
  }, [open]);

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
      const startedAt = Date.now();
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
          const fallback =
            data.reason === "abuse" || data.engine === "rule"
              ? t("rateLimitedAbuse")
              : t("rateLimited");
          throw new Error(data.message?.trim() || fallback);
        }

        if (!res.ok) {
          throw new Error(data.error || t("errorGeneric"));
        }

        const reply = data.reply?.trim() || "…";
        const media =
          Array.isArray(data.media) && data.media.length > 0
            ? data.media
            : undefined;
        const recommendDeeplink =
          typeof data.recommendDeeplink === "string"
            ? data.recommendDeeplink
            : buildRecommendBriefPath(text);
        const plannerDeeplink =
          typeof data.plannerDeeplink === "string"
            ? data.plannerDeeplink
            : buildPlannerBriefPath(text);

        const elapsed = Date.now() - startedAt;
        if (elapsed < ANALYZE_MIN_MS) {
          await new Promise((r) =>
            setTimeout(r, ANALYZE_MIN_MS - elapsed),
          );
        }

        if (
          data.engine === "claude" &&
          typeof data.remaining === "number" &&
          typeof data.limit === "number"
        ) {
          setClaudeQuota({ remaining: data.remaining, limit: data.limit });
        }

        const withReply: AiChatTurn[] = [
          ...nextMessages,
          {
            role: "assistant",
            content: reply,
            media,
            plannerDeeplink: plannerDeeplink ?? undefined,
            recommendDeeplink: recommendDeeplink ?? undefined,
          },
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
        className="pointer-events-auto fixed inset-x-3 bottom-3 top-auto z-[56] mx-auto flex max-h-[min(560px,78dvh,82vh)] min-h-[360px] flex-col overflow-hidden rounded-[24px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white dark:bg-white/5 bg-gray-500 dark:text-white text-gray-900 shadow-[0_28px_120px_rgba(0,0,0,0.7)] backdrop-blur sm:inset-x-auto sm:bottom-6 sm:right-6 sm:left-auto sm:mx-0 sm:w-[min(400px,calc(100vw-2rem))]"
        style={
          keyboardInset > 0
            ? { bottom: `calc(0.75rem + ${keyboardInset}px)` }
            : undefined
        }
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
              {claudeQuota != null
                ? t("remaining", {
                    remaining: claudeQuota.remaining,
                    limit: claudeQuota.limit,
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
            const recommendHref =
              msg.recommendDeeplink ??
              (briefSource ? buildRecommendBriefPath(briefSource) : null);
            const plannerHref =
              msg.plannerDeeplink ??
              (briefSource ? buildPlannerBriefPath(briefSource) : null);

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
                    <Link
                      href="/contact"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#22d3ee]/35 bg-[#22d3ee]/15 px-3 py-2.5 text-xs font-bold text-[#0e7490] transition-colors hover:bg-[#22d3ee]/20 dark:text-[#22d3ee]"
                    >
                      {t("contactCta")}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                    {recommendHref ? (
                      <Link
                        href={recommendHref}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/35 bg-gradient-to-r from-violet-600/90 to-cyan-500/90 px-3 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-95"
                      >
                        {t("recommendCta")}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    ) : null}
                    {plannerHref ? (
                      <Link
                        href={plannerHref}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 px-3 py-2.5 text-xs font-bold dark:text-white/85 text-gray-700 transition-colors hover:dark:bg-white/10 bg-gray-100"
                      >
                        {t("plannerCta")}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    ) : null}
                  </div>
                ) : null}
                {msg.role === "assistant" && !showMedia ? (
                  <Link
                    href="/contact"
                    className="mr-auto flex max-w-[92%] items-center justify-center gap-2 rounded-xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 px-3 py-2 text-[11px] font-bold dark:text-white text-gray-700 hover:dark:bg-white/10 bg-gray-100"
                  >
                    {t("contactCta")}
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                ) : null}
              </div>
            );
          })}
          {loading ? (
            <div className="mr-auto max-w-[92%] space-y-2 rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-black/40 bg-white/60 px-3 py-2.5">
              <p className="font-display text-xs font-medium uppercase tracking-[0.16em] dark:text-violet-200 text-violet-700">
                {t("analyzing")}
              </p>
              <div className="flex gap-1 pt-1" aria-hidden>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:240ms]" />
              </div>
            </div>
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
