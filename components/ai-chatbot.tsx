"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  BarChart3,
  Bot,
  FileText,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
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
      <div className="group/button fixed bottom-6 right-4 z-[55] sm:right-6">
        {showFabPulse ? (
          <span
            className="pointer-events-none absolute inset-0 z-0 animate-ping rounded-full bg-gold/55"
            aria-hidden
          />
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "relative z-10 flex h-14 w-14 items-center justify-center rounded-full text-navy shadow-xl transition-transform duration-200 hover:scale-110 focus-visible:outline focus-visible:ring-2 focus-visible:ring-gold/50",
            "bg-gradient-to-br from-[#f0e4c4] via-gold to-gold-dark",
            open && "from-gold-dark via-[#c9a85c] to-gold",
          )}
          style={{ boxShadow: "0 10px 28px rgba(200, 168, 99, 0.45)" }}
          aria-expanded={open}
          aria-label={open ? t("closeAria") : t("openAria")}
        >
          {open ? (
            <X className="h-6 w-6" strokeWidth={2.5} />
          ) : (
            <MessageCircle className="h-7 w-7" strokeWidth={2} />
          )}
        </button>
        <span
          className="pointer-events-none absolute bottom-full right-0 mb-2 hidden max-w-[11rem] rounded-lg bg-navy px-2.5 py-1.5 text-center text-[11px] font-semibold text-white shadow-md opacity-0 transition-opacity group-hover/button:opacity-100 sm:block"
          role="tooltip"
        >
          {t("tooltip")}
        </span>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[54] bg-black/30 sm:pointer-events-none sm:bg-transparent"
          aria-hidden={false}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          role="presentation"
        >
          <div
            className="pointer-events-auto fixed bottom-6 left-0 right-0 z-[56] flex h-[min(520px,80vh)] max-h-[80vh] w-full flex-col overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-2xl sm:left-auto sm:right-6 sm:h-[min(520px,88vh)] sm:max-h-none sm:w-[min(400px,calc(100vw-2rem))]"
            role="dialog"
            aria-label={t("dialogLabel")}
          >
            <div className="flex shrink-0 flex-col border-b-2 border-gold/50 bg-gradient-to-r from-navy-dark via-navy to-navy-dark text-white">
              <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/20 ring-2 ring-gold/40"
                  aria-hidden
                >
                  <span className="relative">
                    <Bot className="h-5 w-5 text-gold" strokeWidth={2} />
                    <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-gold" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold tracking-tight text-white sm:text-sm">
                    {t("title")}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] font-medium text-gold/90 sm:text-[11px]">
                    {t("subtitle")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="shrink-0 rounded-full p-1.5 text-white/90 hover:bg-white/10"
                  aria-label={t("closeAria")}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div
                className="flex border-t border-gold/25 px-1"
                role="tablist"
                aria-label={t("dialogLabel")}
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={panelTab === tab.id}
                    onClick={() => setPanelTab(tab.id)}
                    className={cn(
                      "min-w-0 flex-1 touch-manipulation border-b-2 py-2.5 text-center text-[11px] font-semibold transition-colors sm:text-xs",
                      panelTab === tab.id
                        ? "border-gold text-gold"
                        : "border-transparent text-white/70 hover:text-white",
                    )}
                  >
                    {tab.id === "chat" ? "💬 " : tab.id === "compare" ? "📊 " : "💛 "}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {panelTab === "chat" ? (
              <>
                <div className="shrink-0 border-b border-navy/8 bg-slate-50/95 px-2 py-2">
                  <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-navy/45">
                    {t("suggestionsLabel")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTION_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        disabled={loading}
                        onClick={() => applySuggestion(t(key))}
                        className="rounded-full border border-navy/12 bg-white px-2.5 py-1.5 text-left text-[11px] font-medium leading-snug text-navy shadow-sm transition hover:border-gold/45 hover:bg-gold/5 disabled:opacity-50"
                      >
                        {t(key)}
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  ref={listRef}
                  className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3"
                >
                  {messages.length === 0 && !loading ? (
                    <p className="px-1 text-center text-xs leading-relaxed text-muted-foreground">
                      {t("emptyState")}
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
                    <p className="text-xs text-muted-foreground">
                      {t("thinking")}
                    </p>
                  ) : null}
                  {error ? (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
                      {error}
                    </p>
                  ) : null}
                </div>

                <div className="shrink-0 border-t border-navy/8 bg-white p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="mb-3 w-full rounded-full border-gold/40 text-xs font-semibold text-navy hover:bg-gold/10"
                    asChild
                  >
                    <Link href="/quote">
                      <FileText className="mr-2 h-3.5 w-3.5" />
                      {t("quoteCta")}
                    </Link>
                  </Button>
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
                      className="min-h-[2.75rem] flex-1 resize-none rounded-2xl border border-navy/15 bg-slate-50 px-3.5 py-2.5 text-sm outline-none ring-gold/25 placeholder:text-muted-foreground focus:border-gold/45 focus:ring-2"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      disabled={loading || !input.trim()}
                      onClick={() => void send()}
                      aria-label={t("send")}
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-navy shadow-md transition hover:brightness-105 disabled:pointer-events-none disabled:opacity-40",
                        "bg-gradient-to-br from-[#f0e4c4] via-gold to-gold-dark",
                      )}
                    >
                      <Send className="h-4 w-4" strokeWidth={2.25} />
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
                    {t("disclaimer")}
                  </p>
                </div>
              </>
            ) : panelTab === "compare" ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex items-center gap-2 border-b border-navy/8 px-4 py-3 text-sm font-bold text-navy">
                  <BarChart3 className="h-4 w-4" />
                  {t("tabCompare")}{" "}
                  <span className="text-muted-foreground">
                    (
                    {t("compareCount", {
                      count: compareEntries.length,
                      max: COMPARE_MAX_ITEMS,
                    })}
                    )
                  </span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                  {compareEntries.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        {t("compareEmpty")}
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/media">{t("compareGoMedia")}</Link>
                      </Button>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {compareEntries.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center gap-2 rounded-xl border border-navy/10 bg-slate-50/90 px-3 py-2.5 text-xs shadow-sm"
                        >
                          <span className="min-w-0 flex-1 truncate font-medium text-navy">
                            {isKo ? e.name : e.nameEn || e.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeCompare(e.id)}
                            className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                            aria-label={t("removeFromCompareAria")}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {compareEntries.length > 0 ? (
                  <div className="shrink-0 space-y-2 border-t border-navy/8 p-3">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-xs font-semibold text-navy/70"
                        onClick={clearCompare}
                      >
                        {t("compareClear")}
                      </Button>
                      {compareEntries.length >= 2 ? (
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1 rounded-full bg-navy text-xs font-bold text-white"
                          asChild
                        >
                          <Link
                            href={`/compare?ids=${compareEntries.map((x) => x.id).join(",")}`}
                          >
                            {t("compareNow")}
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1 rounded-full bg-navy/40 text-xs font-bold text-white"
                          disabled
                        >
                          {t("compareNow")}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-6">
                <p className="text-sm text-muted-foreground">
                  {t("kakaoTabLead")}
                </p>
                <a
                  href={KAKAO_CHANNEL_PUBLIC_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 w-full items-center justify-center rounded-xl border-2 border-[#FEE500] bg-[#FEE500]/15 text-sm font-bold text-[#191919] transition-colors hover:bg-[#FEE500]/30"
                >
                  {t("kakaoOpen")}
                </a>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/contact">{t("contactOther")}</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
