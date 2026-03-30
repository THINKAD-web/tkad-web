"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  BarChart3,
  Bot,
  FileText,
  Mail,
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
      <div className="group/button fixed bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] z-[55] sm:bottom-6 sm:right-6">
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
          className="fixed inset-0 z-[54] bg-navy/45 backdrop-blur-[3px] sm:pointer-events-none sm:bg-transparent sm:backdrop-blur-none"
          aria-hidden={false}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          role="presentation"
        >
          <div
            className="pointer-events-auto fixed bottom-[max(1rem,env(safe-area-inset-bottom,0px))] left-3 right-3 z-[56] flex h-[min(520px,min(85dvh,88vh))] max-h-[min(85dvh,88vh)] min-h-0 min-w-0 max-w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/95 shadow-[0_12px_48px_-8px_rgba(15,23,42,0.45)] ring-1 ring-black/[0.04] backdrop-blur-xl sm:bottom-6 sm:left-auto sm:right-6 sm:h-[min(520px,88vh)] sm:max-h-[88vh] sm:w-[min(400px,calc(100vw-3rem))] sm:max-w-[min(400px,calc(100vw-3rem))]"
            role="dialog"
            aria-label={t("dialogLabel")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 flex-col bg-gradient-to-b from-[#0c1424] via-[#0a1220] to-[#080f1a] text-white">
              <div className="flex items-center gap-2.5 px-3 py-3 sm:gap-3 sm:px-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/25 to-gold/5 shadow-inner ring-1 ring-gold/30"
                  aria-hidden
                >
                  <span className="relative">
                    <Bot className="h-[1.125rem] w-[1.125rem] text-gold" strokeWidth={2} />
                    <Sparkles className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 text-gold/90" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold tracking-tight text-white/95 sm:text-sm">
                    {t("title")}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] font-medium leading-snug text-gold/75 sm:text-[11px]">
                    {t("subtitle")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="shrink-0 rounded-xl p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                  aria-label={t("closeAria")}
                >
                  <X className="h-4 w-4" strokeWidth={2.25} />
                </button>
              </div>
              <div
                className="px-2 pb-2 sm:px-3"
                role="tablist"
                aria-label={t("dialogLabel")}
              >
                <div className="flex gap-1 rounded-xl bg-black/25 p-1 ring-1 ring-white/[0.06]">
                  {tabs.map((tab) => {
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
                          "flex min-w-0 flex-1 touch-manipulation items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-semibold leading-none transition-all sm:gap-1.5 sm:text-[11px]",
                          panelTab === tab.id
                            ? "bg-white/[0.12] text-gold shadow-sm ring-1 ring-gold/25"
                            : "text-white/55 hover:bg-white/[0.06] hover:text-white/90",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {panelTab === "chat" ? (
              <>
                <div className="shrink-0 border-b border-navy/[0.07] bg-gradient-to-b from-slate-50/98 to-slate-50/90 px-2 py-2.5 sm:px-3">
                  <p className="mb-1.5 px-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-navy/40">
                    {t("suggestionsLabel")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTION_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        disabled={loading}
                        onClick={() => applySuggestion(t(key))}
                        className="max-w-full rounded-full border border-navy/[0.1] bg-white/90 px-2.5 py-1.5 text-left text-[11px] font-medium leading-snug text-navy shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02] transition hover:border-gold/35 hover:bg-amber-50/40 disabled:opacity-50"
                      >
                        <span className="break-words">{t(key)}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  ref={listRef}
                  className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-2 py-3 sm:px-3"
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

                <div className="shrink-0 border-t border-navy/[0.08] bg-gradient-to-b from-white to-slate-50/80 p-2.5 sm:p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="mb-2.5 w-full min-w-0 rounded-full border-gold/35 bg-white/80 text-xs font-semibold text-navy shadow-sm hover:bg-amber-50/50"
                    asChild
                  >
                    <Link href="/quote" className="truncate">
                      <FileText className="mr-2 h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{t("quoteCta")}</span>
                    </Link>
                  </Button>
                  <div className="flex min-w-0 gap-2">
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
                      className="min-h-[2.75rem] min-w-0 flex-1 resize-none rounded-2xl border border-navy/12 bg-white px-3 py-2.5 text-sm shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none placeholder:text-muted-foreground/80 focus:border-gold/40 focus:ring-2 focus:ring-gold/20"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      disabled={loading || !input.trim()}
                      onClick={() => void send()}
                      aria-label={t("send")}
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-navy shadow-[0_4px_14px_-2px_rgba(200,168,99,0.55)] transition hover:brightness-[1.03] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
                        "bg-gradient-to-br from-[#f3ead0] via-gold to-[#b8954a]",
                      )}
                    >
                      <Send className="h-4 w-4" strokeWidth={2.25} />
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] leading-snug text-muted-foreground/90">
                    {t("disclaimer")}
                  </p>
                </div>
              </>
            ) : panelTab === "compare" ? (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div className="flex min-w-0 items-center gap-2 border-b border-navy/[0.08] px-3 py-2.5 text-sm font-bold text-navy sm:px-4 sm:py-3">
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
                <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 sm:px-3">
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
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-3 py-5 sm:px-4 sm:py-6">
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
