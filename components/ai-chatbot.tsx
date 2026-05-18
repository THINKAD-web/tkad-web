"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  BarChart3,
  Bot,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  Send,
  X,
} from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { AiChatbotMessage } from "@/components/ai-chatbot-message";
import type { AiChatbotMediaCard } from "@/lib/ai-chatbot-tools";
import { cn } from "@/lib/utils";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
import {
  getCompareCartEntries,
  setCompareCartEntries,
  subscribeCompareCart,
  type CompareCartEntry,
} from "@/lib/compare-cart-client";

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  media?: AiChatbotMediaCard[];
  ts?: number;
};

const SUGGESTION_KEYS = ["suggestion1", "suggestion2", "suggestion3"] as const;

type PanelTab = "chat" | "compare" | "inquiry";

export type AiChatbotProps = {
  /** 플로팅 도크 등 외부 트리거 사용 시 기본 FAB 숨김 */
  hideFab?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function AiChatbot({
  hideFab = false,
  open: controlledOpen,
  onOpenChange,
}: AiChatbotProps = {}) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const t = useTranslations("aiChatbot");
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange],
  );
  const [panelTab, setPanelTab] = useState<PanelTab>("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compareEntries, setCompareEntries] = useState<CompareCartEntry[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastReadCountRef = useRef(0);

  useEffect(() => {
    if (open) lastReadCountRef.current = messages.length;
  }, [open, messages.length]);

  const showFabPulse =
    !open && messages.length > lastReadCountRef.current;

  const refreshCompare = useCallback(() => {
    setCompareEntries(getCompareCartEntries());
  }, []);

  useEffect(() => {
    refreshCompare();
    return subscribeCompareCart(refreshCompare);
  }, [refreshCompare]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open, loading]);

  useEffect(() => {
    if (open && panelTab === "chat") inputRef.current?.focus();
  }, [open, panelTab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || loading) return;
      setInput("");
      setError(null);
      const userMsg: ChatTurn = {
        role: "user",
        content: text,
        ts: Date.now(),
      };
      setMessages((m) => [...m, userMsg]);
      setLoading(true);
      try {
        const history = messages.map(({ role, content }) => ({ role, content }));
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history,
            locale: locale === "en" ? "en" : "ko",
          }),
        });
        const data = (await res.json()) as {
          reply?: string;
          media?: AiChatbotMediaCard[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || t("errorGeneric"));
        }
        const reply = data.reply?.trim() || "…";
        const media = Array.isArray(data.media) ? data.media : undefined;
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: reply,
            media,
            ts: Date.now(),
          },
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("errorGeneric"));
        setMessages((m) => m.slice(0, -1));
        setInput(text);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, locale, messages, t],
  );

  const applySuggestion = (q: string) => {
    setInput(q);
    void send(q);
  };

  const removeCompare = (id: string) => {
    const next = getCompareCartEntries().filter((e) => e.id !== id);
    setCompareCartEntries(next);
    setCompareEntries(next);
  };

  const clearCompare = () => {
    setCompareCartEntries([]);
    setCompareEntries([]);
  };

  const tabs: { id: PanelTab; label: string }[] = [
    { id: "chat", label: t("tabChat") },
    { id: "compare", label: t("tabCompare") },
    { id: "inquiry", label: t("tabInquiry") },
  ];

  return (
    <>
      {!hideFab ? (
        <div className="group/button fixed bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] z-[55] sm:bottom-6 sm:right-6">
          {showFabPulse ? (
            <span
              className="pointer-events-none absolute inset-0 z-0 animate-ping rounded-full bg-[linear-gradient(90deg,rgba(168,85,247,0.55),rgba(34,211,238,0.55),rgba(236,72,153,0.55))]"
              aria-hidden
            />
          ) : null}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className={cn(
              "relative z-10 flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/12 bg-black/40 text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-white/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25",
              open
                ? "bg-black/55"
                : "bg-[linear-gradient(135deg,rgba(168,85,247,0.9),rgba(34,211,238,0.9),rgba(236,72,153,0.9))] text-white border-white/14",
            )}
            aria-expanded={open}
            aria-label={open ? t("closeAria") : t("openAria")}
          >
            {open ? (
              <X className="h-5 w-5" strokeWidth={2.5} />
            ) : (
              <MessageCircle className="h-5 w-5" strokeWidth={2} />
            )}
          </button>
          <span
            className="pointer-events-none absolute bottom-full right-0 mb-2 hidden max-w-[14rem] rounded-2xl border border-white/12 bg-black/55 px-3 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 opacity-0 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur transition-opacity group-hover/button:opacity-100 sm:block"
            role="tooltip"
          >
            {t("tooltip")}
          </span>
        </div>
      ) : null}

      {/* === Dialog overlay + panel === */}
      {open ? (
        <div
          className="fixed inset-0 z-[54] bg-black/55 sm:pointer-events-none sm:bg-transparent"
          aria-hidden={false}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          role="presentation"
        >
          <div
            className="pointer-events-auto fixed inset-x-3 bottom-3 top-auto z-[56] mx-auto flex max-h-[55vh] min-h-[320px] flex-col overflow-hidden rounded-[24px] border border-white/12 bg-black/45 text-white shadow-[0_28px_120px_rgba(0,0,0,0.65)] backdrop-blur sm:inset-x-auto sm:bottom-6 sm:right-6 sm:left-auto sm:top-auto sm:mx-0 sm:h-[min(520px,72vh)] sm:max-h-[72vh] sm:min-h-0 sm:w-[392px] sm:max-w-[392px]"
            role="dialog"
            aria-label={t("dialogLabel")}
            onClick={(e) => e.stopPropagation()}
          >
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10] tkad-neon-grid" />
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-24 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.22),transparent_58%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.18),transparent_58%),radial-gradient(circle_at_left,rgba(236,72,153,0.14),transparent_62%)]"
            />
            {/* Header — 검정 단색 + 모노 라벨 */}
            <div className="relative flex shrink-0 flex-col border-b border-white/10 bg-black/35">
              <div className="flex items-center gap-3 px-4 py-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-white/14 bg-white/8 text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur"
                  aria-hidden
                >
                  <Bot className="h-6 w-6" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/65">
                    [ AI ASSISTANT ]
                  </p>
                  <p className="mt-1 truncate text-base font-black tracking-tight text-white">
                    {t("title")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-white/14 bg-white/6 text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label={t("closeAria")}
                >
                  <X className="h-4 w-4" strokeWidth={2.25} />
                </button>
              </div>
              {/* Tabs */}
              <div
                className="flex gap-0 border-t border-white/10"
                role="tablist"
                aria-label={t("dialogLabel")}
              >
                {tabs.map((tab, i) => {
                  const Icon =
                    tab.id === "chat"
                      ? MessageCircle
                      : tab.id === "compare"
                        ? BarChart3
                        : Mail;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={panelTab === tab.id}
                      onClick={() => setPanelTab(tab.id)}
                      className={cn(
                        "flex min-w-0 flex-1 items-center justify-center gap-1.5 px-2 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] transition-colors",
                        i > 0 && "border-l border-white/10",
                        panelTab === tab.id
                          ? "bg-white/10 text-white"
                          : "text-white/70 hover:bg-white/6 hover:text-white",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {panelTab === "chat" ? (
              <>
                {/* Suggestions */}
                <div className="relative shrink-0 border-b border-white/10 bg-black/20 px-3 py-3">
                  <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/65">
                    [ {t("suggestionsLabel")} ]
                  </p>
                  <div className="flex flex-wrap gap-0">
                    {SUGGESTION_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        disabled={loading}
                        onClick={() => applySuggestion(t(key))}
                        className="-mt-[2px] -ml-[2px] max-w-full rounded-xl border border-white/12 bg-white/6 px-2.5 py-1.5 text-left font-mono text-[11px] font-bold tracking-tight text-white/85 transition-colors hover:bg-white/10 disabled:opacity-35"
                      >
                        <span className="break-words">{t(key)}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Messages */}
                <div
                  ref={listRef}
                  className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden bg-black/10 px-3 py-3"
                >
                  {messages.length === 0 && !loading ? (
                    <p className="px-1 text-center font-mono text-[12px] tracking-tight text-white/55">
                      {`// `}{t("emptyState")}
                    </p>
                  ) : null}
                  {messages.map((msg, i) => (
                    <AiChatbotMessage
                      key={`${i}-${msg.role}-${msg.content.slice(0, 24)}`}
                      role={msg.role}
                      content={msg.content}
                      media={msg.media}
                      isKo={isKo}
                      ts={msg.ts}
                    />
                  ))}
                  {loading ? (
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/55">
                      {`// `}{t("thinking")}
                    </p>
                  ) : null}
                  {error ? (
                    <p className="rounded-2xl border border-white/14 bg-black/35 px-3 py-2 font-mono text-[12px] tracking-tight text-white/85">
                      {`// `}{error}
                    </p>
                  ) : null}
                </div>

                {/* Input area */}
                <div className="relative shrink-0 border-t border-white/10 bg-black/25 p-3">
                  <BtnBlock
                    href="/quote"
                    variant="secondary"
                    size="sm"
                    className="mb-2 w-full rounded-[18px] border border-white/12 bg-white/8 text-white hover:bg-white/12"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{t("quoteCta")}</span>
                  </BtnBlock>
                  <div className="flex min-w-0 gap-0">
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
                      className="min-h-[2.75rem] min-w-0 flex-1 resize-none rounded-[18px] border border-white/12 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none placeholder:text-white/50 focus:border-white/20 focus:ring-2 focus:ring-white/15"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      disabled={loading || !input.trim()}
                      onClick={() => void send()}
                      aria-label={t("send")}
                      className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-white/14 bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(34,211,238,0.95),rgba(236,72,153,0.95))] text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)] transition-all hover:-translate-y-0.5 hover:opacity-95 disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Send className="h-4 w-4" strokeWidth={2.25} />
                    </button>
                  </div>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                    {`// `}{t("disclaimer")}
                  </p>
                </div>
              </>
            ) : panelTab === "compare" ? (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-black/10">
                <div className="flex min-w-0 items-center gap-2 border-b border-white/10 bg-black/20 px-4 py-3">
                  <BarChart3 className="h-4 w-4 text-white/75" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/65">
                    [ {t("tabCompare")} ]
                  </span>
                  <span className="ml-auto font-mono text-[11px] font-bold tabular-nums text-white/80">
                    {t("compareCount", {
                      count: compareEntries.length,
                      max: COMPARE_MAX_ITEMS,
                    })}
                  </span>
                </div>
                <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
                  {compareEntries.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-8 text-center">
                      <p className="font-mono text-[12px] tracking-tight text-white/55">
                        {`// `}{t("compareEmpty")}
                      </p>
                      <BtnBlock
                        href="/media"
                        variant="secondary"
                        size="sm"
                        className="rounded-[18px] border border-white/12 bg-white/8 text-white hover:bg-white/12"
                      >
                        {t("compareGoMedia")}
                      </BtnBlock>
                    </div>
                  ) : (
                    <ul className="space-y-0">
                      {compareEntries.map((e) => (
                        <li
                          key={e.id}
                          className="mb-2 flex items-center gap-2 rounded-[18px] border border-white/12 bg-black/30 px-3 py-2.5 text-xs backdrop-blur transition-colors hover:bg-black/35"
                        >
                          <span className="min-w-0 flex-1 truncate font-bold tracking-tight text-white/90">
                            {isKo ? e.name : (e.nameEn || e.name) || e.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeCompare(e.id)}
                            className="shrink-0 rounded-xl border border-white/12 bg-white/6 p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                            aria-label={t("removeFromCompareAria")}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {compareEntries.length > 0 ? (
                  <div className="shrink-0 border-t border-white/10 bg-black/25 p-3">
                    <div className="flex gap-0">
                      <BtnBlock
                        variant="secondary"
                        size="sm"
                        onClick={clearCompare}
                        className="flex-1 rounded-[18px] border border-white/12 bg-white/8 text-white hover:bg-white/12"
                      >
                        {t("compareClear")}
                      </BtnBlock>
                      {compareEntries.length >= 2 ? (
                        <BtnBlock
                          href={`/compare?ids=${compareEntries.map((x) => x.id).join(",")}`}
                          variant="dark"
                          size="sm"
                          className="-ml-2 flex-1 rounded-[18px] border border-white/14 bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(34,211,238,0.95),rgba(236,72,153,0.95))] text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)] transition-all hover:-translate-y-0.5 hover:opacity-95"
                        >
                          {t("compareNow")}
                        </BtnBlock>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="-ml-2 flex-1 rounded-[18px] border border-white/12 bg-white/6 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white/55 opacity-60"
                        >
                          {t("compareNow")}
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden bg-black/10 px-4 py-5">
                <p className="font-mono text-[12px] leading-relaxed tracking-tight text-white/60">
                  {`// `}{t("kakaoTabLead")}
                </p>
                <a
                  href={KAKAO_CHANNEL_PUBLIC_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 w-full items-center justify-center rounded-[18px] border border-white/12 px-5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#191919] shadow-[0_18px_60px_rgba(0,0,0,0.45)] transition-all hover:-translate-y-0.5 hover:opacity-95"
                  style={{ backgroundColor: "#FEE500" }}
                >
                  {isKo ? "카카오톡채널" : "KakaoTalk Channel"}
                </a>
                <a
                  href="tel:02-515-2772"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-white/12 bg-white/8 px-5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/12"
                >
                  <Phone className="h-4 w-4" />
                  {isKo ? "전화문의" : "Call"} 02-515-2772
                </a>
                <BtnBlock
                  href="/contact"
                  variant="secondary"
                  size="md"
                  className="w-full rounded-[18px] border border-white/12 bg-white/8 text-white hover:bg-white/12"
                >
                  {t("contactOther")}
                </BtnBlock>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
