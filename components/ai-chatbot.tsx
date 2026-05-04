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
import { Link } from "@/i18n/navigation";
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

export default function AiChatbot() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const t = useTranslations("aiChatbot");
  const [open, setOpen] = useState(false);
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
      {/* === Floating trigger button === */}
      <div className="group/button fixed bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] z-[55] sm:bottom-6 sm:right-6">
        {showFabPulse ? (
          <span
            className="pointer-events-none absolute inset-0 z-0 animate-ping bg-accent/55"
            aria-hidden
          />
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "relative z-10 flex h-11 w-11 items-center justify-center border-2 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
            open
              ? "border-border bg-hero-void text-hero-fg hover:bg-accent hover:border-accent"
              : "border-border bg-accent text-white hover:bg-foreground hover:border-border",
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
          className="pointer-events-none absolute bottom-full right-0 mb-2 hidden max-w-[11rem] border-2 border-border bg-hero-void px-3 py-1.5 text-center font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-hero-fg opacity-0 transition-opacity group-hover/button:opacity-100 sm:block"
          role="tooltip"
        >
          {t("tooltip")}
        </span>
      </div>

      {/* === Dialog overlay + panel === */}
      {open ? (
        <div
          className="fixed inset-0 z-[54] bg-hero-void/45 sm:pointer-events-none sm:bg-transparent"
          aria-hidden={false}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          role="presentation"
        >
          <div
            className="pointer-events-auto fixed inset-x-3 bottom-3 top-auto z-[56] mx-auto flex max-h-[50vh] min-h-[300px] flex-col overflow-hidden border-2 border-border bg-card sm:inset-x-auto sm:bottom-6 sm:right-6 sm:left-auto sm:top-auto sm:mx-0 sm:h-[min(480px,70vh)] sm:max-h-[70vh] sm:min-h-0 sm:w-[380px] sm:max-w-[380px]"
            role="dialog"
            aria-label={t("dialogLabel")}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — 검정 단색 + 모노 라벨 */}
            <div className="flex shrink-0 flex-col border-b-2 border-border bg-hero-void text-hero-fg">
              <div className="flex items-center gap-3 px-4 py-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-accent bg-accent text-accent-foreground"
                  aria-hidden
                >
                  <Bot className="h-6 w-6" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
                    [ AI ASSISTANT ]
                  </p>
                  <p className="mt-1 truncate text-base font-bold tracking-tight text-hero-fg">
                    {t("title")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-hero-fg bg-transparent text-hero-fg transition-colors hover:bg-card hover:text-foreground"
                  aria-label={t("closeAria")}
                >
                  <X className="h-4 w-4" strokeWidth={2.25} />
                </button>
              </div>
              {/* Tabs */}
              <div
                className="flex gap-0 border-t-2 border-hero-fg/20"
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
                        i > 0 && "border-l-2 border-hero-fg/20",
                        panelTab === tab.id
                          ? "bg-accent text-accent-foreground"
                          : "text-hero-fg/70 hover:bg-card/10 hover:text-background",
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
                <div className="shrink-0 border-b-2 border-border bg-muted px-3 py-3">
                  <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                    [ {t("suggestionsLabel")} ]
                  </p>
                  <div className="flex flex-wrap gap-0">
                    {SUGGESTION_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        disabled={loading}
                        onClick={() => applySuggestion(t(key))}
                        className="-mt-[2px] -ml-[2px] max-w-full border-2 border-border bg-card px-2.5 py-1.5 text-left font-mono text-[11px] font-bold tracking-tight text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-40"
                      >
                        <span className="break-words">{t(key)}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Messages */}
                <div
                  ref={listRef}
                  className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden bg-card px-3 py-3"
                >
                  {messages.length === 0 && !loading ? (
                    <p className="px-1 text-center font-mono text-[12px] tracking-tight text-muted-foreground">
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
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {`// `}{t("thinking")}
                    </p>
                  ) : null}
                  {error ? (
                    <p className="border-2 border-accent bg-card px-3 py-2 font-mono text-[12px] tracking-tight text-accent">
                      {`// `}{error}
                    </p>
                  ) : null}
                </div>

                {/* Input area */}
                <div className="shrink-0 border-t-2 border-border bg-muted p-3">
                  <BtnBlock
                    href="/quote"
                    variant="secondary"
                    size="sm"
                    className="mb-2 w-full"
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
                      className="min-h-[2.75rem] min-w-0 flex-1 resize-none border-2 border-border bg-card px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      disabled={loading || !input.trim()}
                      onClick={() => void send()}
                      aria-label={t("send")}
                      className="-ml-[2px] flex h-11 w-11 shrink-0 items-center justify-center border-2 border-accent bg-accent text-white transition-colors hover:bg-foreground hover:border-border hover:text-background disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Send className="h-4 w-4" strokeWidth={2.25} />
                    </button>
                  </div>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {`// `}{t("disclaimer")}
                  </p>
                </div>
              </>
            ) : panelTab === "compare" ? (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-card">
                <div className="flex min-w-0 items-center gap-2 border-b-2 border-border bg-muted px-4 py-3">
                  <BarChart3 className="h-4 w-4 text-accent" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                    [ {t("tabCompare")} ]
                  </span>
                  <span className="ml-auto font-mono text-[11px] font-bold tabular-nums text-foreground">
                    {t("compareCount", {
                      count: compareEntries.length,
                      max: COMPARE_MAX_ITEMS,
                    })}
                  </span>
                </div>
                <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
                  {compareEntries.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-8 text-center">
                      <p className="font-mono text-[12px] tracking-tight text-muted-foreground">
                        {`// `}{t("compareEmpty")}
                      </p>
                      <BtnBlock href="/media" variant="secondary" size="sm">
                        {t("compareGoMedia")}
                      </BtnBlock>
                    </div>
                  ) : (
                    <ul className="space-y-0">
                      {compareEntries.map((e) => (
                        <li
                          key={e.id}
                          className="-mt-[2px] flex items-center gap-2 border-2 border-border bg-card px-3 py-2.5 text-xs"
                        >
                          <span className="min-w-0 flex-1 truncate font-bold tracking-tight text-foreground">
                            {isKo ? e.name : (e.nameEn || e.name) || e.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeCompare(e.id)}
                            className="shrink-0 border-2 border-border bg-card p-1 text-foreground transition-colors hover:bg-accent hover:border-accent hover:text-background"
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
                  <div className="shrink-0 border-t-2 border-border bg-muted p-3">
                    <div className="flex gap-0">
                      <BtnBlock
                        variant="secondary"
                        size="sm"
                        onClick={clearCompare}
                        className="flex-1"
                      >
                        {t("compareClear")}
                      </BtnBlock>
                      {compareEntries.length >= 2 ? (
                        <BtnBlock
                          href={`/compare?ids=${compareEntries.map((x) => x.id).join(",")}`}
                          variant="dark"
                          size="sm"
                          className="-ml-[2px] flex-1"
                        >
                          {t("compareNow")}
                        </BtnBlock>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="-ml-[2px] flex-1 border-2 border-border bg-muted-foreground/40 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-hero-fg opacity-60"
                        >
                          {t("compareNow")}
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden bg-card px-4 py-5">
                <p className="font-mono text-[12px] leading-relaxed tracking-tight text-muted-foreground">
                  {`// `}{t("kakaoTabLead")}
                </p>
                <a
                  href={KAKAO_CHANNEL_PUBLIC_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 w-full items-center justify-center border-2 border-border px-5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#191919] transition-colors hover:bg-foreground hover:text-[#FEE500]"
                  style={{ backgroundColor: "#FEE500" }}
                >
                  {isKo ? "카카오톡채널" : "KakaoTalk Channel"}
                </a>
                <a
                  href="tel:02-515-2772"
                  className="flex h-12 w-full items-center justify-center gap-2 border-2 border-border bg-card px-5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-foreground hover:text-background"
                >
                  <Phone className="h-4 w-4" />
                  {isKo ? "전화문의" : "Call"} 02-515-2772
                </a>
                <BtnBlock href="/contact" variant="secondary" size="md" className="w-full">
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
