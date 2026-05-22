"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type RoomRow = {
  id: string;
  mediaName: string;
  advertiser: { email: string; name: string; company: string | null };
  owner: { email: string; name: string };
  status: string;
  messageCount: number;
  lastMessage: string | null;
  lastMessageAt: string;
  contactBlockedLast: boolean;
  ownerFirstReplyAt: string | null;
  oohQuoteId: string | null;
};

type DetailMessage = {
  id: string;
  displayLabel: string;
  senderRole: string;
  body: string;
  bodySanitized: string;
  contactBlocked: boolean;
  sender: { email: string; name: string } | null;
  createdAt: string;
};

export function AdminChatMonitor() {
  const [items, setItems] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailMessage[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadList = useCallback(async () => {
    const res = await fetch("/api/admin/chat/rooms", { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.items) setItems(json.items as RoomRow[]);
    setLoading(false);
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    const res = await fetch(`/api/admin/chat/rooms/${id}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.messages) {
      setDetail(json.messages as DetailMessage[]);
    }
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-2 max-h-[70vh] overflow-y-auto">
        {items.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelectedId(r.id)}
            className={`w-full rounded-xl border p-3 text-left text-sm ${
              selectedId === r.id ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <p className="font-bold">{r.mediaName}</p>
            <p className="text-xs text-muted-foreground">
              광고주: {r.advertiser.company || r.advertiser.name} ({r.advertiser.email})
            </p>
            <p className="text-xs text-muted-foreground">
              매체사: {r.owner.name} ({r.owner.email})
            </p>
            {r.lastMessage ? (
              <p className="mt-1 line-clamp-2 text-muted-foreground">{r.lastMessage}</p>
            ) : null}
            {r.contactBlockedLast ? (
              <span className="text-xs text-amber-600">연락처 차단됨</span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-border p-4 max-h-[70vh] overflow-y-auto">
        {!selectedId ? (
          <p className="text-sm text-muted-foreground">채팅방을 선택하세요</p>
        ) : detailLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <div className="space-y-3">
            {detail.map((m) => (
              <div key={m.id} className="rounded-2xl bg-muted/40 p-2 text-sm">
                <p className="text-[10px] font-mono uppercase text-muted-foreground">
                  {m.displayLabel} · {m.senderRole}
                  {m.sender ? ` · ${m.sender.email}` : ""}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                {m.contactBlocked ? (
                  <p className="text-xs text-amber-600">차단된 연락처 포함</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
