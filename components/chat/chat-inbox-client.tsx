"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MessageCircle } from "lucide-react";
import { FullPageSpinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type RoomItem = {
  id: string;
  mediaName: string;
  mediaLocation: string;
  mediaImage: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  ownerReplied: boolean;
  slaDueAt: string | null;
  quoteId: string | null;
};

export function ChatInboxClient({ side }: { side: "advertiser" | "owner" }) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RoomItem[]>([]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/chat/rooms?side=${side}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setItems(json.data.items as RoomItem[]);
    }
    setLoading(false);
  }, [side]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <FullPageSpinner />;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card/50 p-10 text-center">
        <MessageCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("inboxEmpty")}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((room) => {
        const overdue =
          side === "owner" &&
          !room.ownerReplied &&
          room.slaDueAt &&
          new Date(room.slaDueAt) < new Date();
        return (
          <li key={room.id}>
            <Link
              href={`/chat/${room.id}`}
              className={cn(
                "flex gap-3 rounded-2xl border border-border/70 bg-card/80 p-4 transition-colors hover:bg-card",
                overdue && "border-amber-500/50",
              )}
            >
              {room.mediaImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={room.mediaImage}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <MessageCircle className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{room.mediaName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {room.mediaLocation}
                </p>
                {room.lastMessage ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {room.lastMessage}
                  </p>
                ) : null}
                {overdue ? (
                  <p className="mt-1 text-xs font-semibold text-amber-600">
                    {t("slaOverdue")}
                  </p>
                ) : null}
                {room.quoteId ? (
                  <p className="mt-1 text-xs text-primary">{t("hasQuote")}</p>
                ) : null}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
