"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ADVERTISER_QUICK_REPLIES_KO,
  OWNER_QUICK_REPLIES_KO,
} from "@/lib/chat-constants";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { cn } from "@/lib/utils";
import { FileText, Loader2, Paperclip, Send } from "lucide-react";
import { useToast } from "@/components/toast-provider";

type Message = {
  id: string;
  senderRole: string;
  displayLabel: string;
  body: string;
  contactBlocked: boolean;
  attachmentUrl: string | null;
  attachmentType: string | null;
  attachmentName: string | null;
  isAutoReply: boolean;
  quoteId: string | null;
  createdAt: string;
};

type RoomData = {
  id: string;
  side: "advertiser" | "owner" | "admin";
  locale: string;
  ownerReplied: boolean;
  slaDueAt: string | null;
  quoteId: string | null;
  quoteStatus: string | null;
  previewUrl: string | null;
  contractUrl: string | null;
  media: {
    id: string;
    name: string;
    location: string;
    type: string;
    price: number;
    pricePeriod: string | null;
    image: string | null;
    width: string | null;
    height: string | null;
  };
};

export function ChatRoomClient({ roomId }: { roomId: string }) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/chat/rooms/${roomId}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setLoading(false);
      return;
    }
    setRoom(json.data.room as RoomData);
    setMessages(json.data.messages as Message[]);
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 12_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const quickReplies =
    room?.side === "owner"
      ? OWNER_QUICK_REPLIES_KO
      : ADVERTISER_QUICK_REPLIES_KO;

  async function sendMessage(body?: string) {
    const payload = (body ?? text).trim();
    if (!payload) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: payload }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast("error", json.error?.message ?? t("sendError"));
        return;
      }
      if (json.data.contactBlocked) {
        toast("error", t("contactBlocked"));
      }
      setText("");
      await load();
    } finally {
      setSending(false);
    }
  }

  async function uploadFile(file: File) {
    const signRes = await fetch(`/api/chat/rooms/${roomId}/upload-sign`, {
      method: "POST",
    });
    const signJson = await signRes.json();
    if (!signRes.ok || !signJson.ok) {
      toast("error", t("uploadError"));
      return;
    }
    const { cloudName, apiKey, timestamp, signature, folder } = signJson.data;
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", apiKey);
    form.append("timestamp", String(timestamp));
    form.append("signature", signature);
    form.append("folder", folder);
    const up = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      { method: "POST", body: form },
    );
    const upJson = await up.json();
    if (!up.ok || !upJson.secure_url) {
      toast("error", t("uploadError"));
      return;
    }
    const attachmentType = file.type.includes("pdf") ? "pdf" : "image";
    const res = await fetch(`/api/chat/rooms/${roomId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: file.name,
        attachmentUrl: upJson.secure_url as string,
        attachmentType,
        attachmentName: file.name,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      toast("error", t("sendError"));
      return;
    }
    await load();
  }

  async function createQuote() {
    setQuoteLoading(true);
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/quote-draft`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast("error", json.error?.message ?? t("quoteError"));
        return;
      }
      toast("success", t("quoteCreated"));
      await load();
    } finally {
      setQuoteLoading(false);
    }
  }

  async function acceptQuote() {
    setQuoteLoading(true);
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/accept-quote`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast("error", json.error?.message ?? t("acceptError"));
        return;
      }
      toast("success", t("quoteAccepted"));
      if (json.data.contractUrl) {
        window.location.href = json.data.contractUrl as string;
      } else {
        await load();
      }
    } finally {
      setQuoteLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!room) {
    return (
      <p className="text-center text-muted-foreground">{t("roomNotFound")}</p>
    );
  }

  const priceLabel = formatCatalogPriceFieldWon(room.media.price, locale);

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col rounded-2xl border border-border/70 bg-card/60 overflow-hidden">
      <div className="sticky top-0 z-10 border-b border-border/60 bg-card/95 p-4 backdrop-blur">
        <div className="flex gap-3">
          {room.media.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={room.media.image}
              alt=""
              className="h-16 w-16 rounded-xl object-cover"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <Link
              href={`/media/${room.media.id}`}
              className="font-bold hover:underline"
            >
              {room.media.name}
            </Link>
            <p className="text-xs text-muted-foreground">{room.media.location}</p>
            <p className="text-xs text-muted-foreground">
              {room.media.type} · {priceLabel}
              {room.media.width && room.media.height
                ? ` · ${room.media.width}×${room.media.height}`
                : ""}
            </p>
            <MediaPriceExclNote isKo={locale.startsWith("ko")} className="mt-0.5" />
          </div>
        </div>
        {room.side === "owner" && !room.ownerReplied && room.slaDueAt ? (
          <p className="mt-2 text-xs text-amber-600">{t("slaHint")}</p>
        ) : null}
        <p className="mt-2 tkad-type-caption text-muted-foreground">{t("anonNotice")}</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
          const isMine =
            (room.side === "advertiser" && m.senderRole === "advertiser") ||
            (room.side === "owner" && m.senderRole === "owner");
          const isSystem = m.senderRole === "system";
          return (
            <div
              key={m.id}
              className={cn(
                "flex flex-col max-w-[85%]",
                isMine ? "ml-auto items-end" : "items-start",
                isSystem && "mx-auto max-w-full items-center",
              )}
            >
              <span className="mb-0.5 tkad-type-note font-display uppercase tracking-wider text-muted-foreground">
                {m.displayLabel}
                {m.isAutoReply ? ` · ${t("autoReply")}` : ""}
              </span>
              <div
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm",
                  isSystem && "bg-muted/60 text-center text-muted-foreground",
                  isMine && !isSystem && "bg-primary text-primary-foreground",
                  !isMine && !isSystem && "bg-muted",
                )}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
                {m.contactBlocked ? (
                  <p className="mt-1 text-xs opacity-80">{t("contactBlocked")}</p>
                ) : null}
                {m.attachmentUrl ? (
                  m.attachmentType === "pdf" ? (
                    <a
                      href={m.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs underline"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {m.attachmentName ?? "PDF"}
                    </a>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.attachmentUrl}
                      alt=""
                      className="mt-2 max-h-48 rounded-lg"
                    />
                  )
                ) : null}
                {m.quoteId && room.previewUrl ? (
                  <a
                    href={room.previewUrl}
                    className="mt-2 block text-xs underline"
                  >
                    {t("viewQuote")}
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border/60 bg-card/95 p-3 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {quickReplies.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void sendMessage(q)}
              disabled={sending}
              className="rounded-full border border-border/80 px-2.5 py-1 tkad-type-caption hover:bg-muted"
            >
              {q}
            </button>
          ))}
        </div>

        {room.side === "owner" ? (
          <button
            type="button"
            onClick={() => void createQuote()}
            disabled={quoteLoading}
            className="w-full rounded-xl border border-primary/40 bg-primary/10 py-2 tkad-type-title text-primary"
          >
            {quoteLoading ? t("working") : t("createQuote")}
          </button>
        ) : null}

        {room.side === "advertiser" && room.quoteId && room.previewUrl ? (
          <div className="flex gap-2">
            <a
              href={room.previewUrl}
              className="flex-1 rounded-xl border py-2 text-center text-sm"
            >
              {t("viewQuote")}
            </a>
            <button
              type="button"
              onClick={() => void acceptQuote()}
              disabled={quoteLoading}
              className="flex-1 rounded-xl bg-primary py-2 tkad-type-title text-primary-foreground"
            >
              {t("acceptQuote")}
            </button>
          </div>
        ) : null}

        <div className="flex gap-2">
          <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border/80 hover:bg-muted">
            <Paperclip className="h-4 w-4" />
            <input
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadFile(f);
                e.target.value = "";
              }}
            />
          </label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            placeholder={t("placeholder")}
            className="min-w-0 flex-1 rounded-xl border border-border/80 bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={sending || !text.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
