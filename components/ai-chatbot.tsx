"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileText, MessageCircle, Send, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AiChatbotMessage } from "@/components/ai-chatbot-message";
import type { AiChatbotMediaCard } from "@/lib/ai-chatbot-tools";
import { cn } from "@/lib/utils";

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  media?: AiChatbotMediaCard[];
};

const SUGGESTION_KEYS = ["suggestion1", "suggestion2", "suggestion3", "suggestion4"] as const;

export default function AiChatbot() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const t = useTranslations("aiChatbot");
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
      const userMsg: ChatTurn = { role: "user", content: text };
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
        setMessages((m) => [...m, { role: "assistant", content: reply, media }]);
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

  return (
    <>
      <div className="group/button fixed bottom-6 right-[4.75rem] z-[55] sm:right-[4.75rem]">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "relative flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-transform hover:scale-105 focus-visible:outline focus-visible:ring-2 focus-visible:ring-navy/30",
            open
              ? "bg-gold-dark text-navy"
              : "bg-gold text-navy hover:bg-gold-dark",
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
          className="pointer-events-none absolute bottom-full right-0 mb-2 hidden max-w-[10rem] rounded-lg bg-navy px-2.5 py-1.5 text-center text-[11px] font-semibold text-white shadow-md opacity-0 transition-opacity group-hover/button:opacity-100 sm:block"
          role="tooltip"
        >
          {t("tooltip")}
        </span>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[54] bg-black/30 sm:bg-transparent sm:pointer-events-none"
          aria-hidden={false}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          role="presentation"
        >
          <div
            className="pointer-events-auto fixed bottom-6 right-4 z-[56] flex h-[min(500px,85vh)] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-2xl sm:right-[4.75rem]"
            role="dialog"
            aria-label={t("title")}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-navy/8 bg-navy px-4 py-3 text-white">
              <p className="text-sm font-bold tracking-tight">{t("title")}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-white/90 hover:bg-white/10"
                aria-label={t("closeAria")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              ref={listRef}
              className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3"
            >
              {messages.length === 0 && !loading ? (
                <>
                  <p className="px-1 text-center text-xs leading-relaxed text-muted-foreground">
                    {t("emptyState")}
                  </p>
                  <div className="flex flex-col gap-2 px-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-navy/50">
                      {t("suggestionsLabel")}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {SUGGESTION_KEYS.map((key) => (
                        <button
                          key={key}
                          type="button"
                          disabled={loading}
                          onClick={() => applySuggestion(t(key))}
                          className="rounded-xl border border-navy/10 bg-slate-50 px-3 py-2 text-left text-xs leading-snug text-navy transition hover:border-gold/40 hover:bg-white disabled:opacity-50"
                        >
                          {t(key)}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
              {messages.map((msg, i) => (
                <AiChatbotMessage
                  key={`${i}-${msg.role}-${msg.content.slice(0, 24)}`}
                  role={msg.role}
                  content={msg.content}
                  media={msg.media}
                  isKo={isKo}
                />
              ))}
              {loading ? (
                <p className="text-xs text-muted-foreground">{t("thinking")}</p>
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
                  className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-navy/15 bg-slate-50 px-3 py-2 text-sm outline-none ring-gold/30 placeholder:text-muted-foreground focus:border-gold/40 focus:ring-2"
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="cta"
                  size="icon"
                  className="btn-gold h-11 w-11 shrink-0 rounded-xl"
                  disabled={loading || !input.trim()}
                  onClick={() => void send()}
                  aria-label={t("send")}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
                {t("disclaimer")}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
