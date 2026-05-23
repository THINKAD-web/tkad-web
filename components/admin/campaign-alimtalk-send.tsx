"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ALIMTALK_TEMPLATE_LABELS,
  type AlimtalkTemplateCode,
} from "@/lib/kakao-alimtalk";

/** 광고주 대상 5종 (문의·견적·확정·D-1·리포트) */
const CAMPAIGN_TEMPLATES: AlimtalkTemplateCode[] = [
  "TKAD_INQUIRY_RECEIVED",
  "TKAD_QUOTE_SENT",
  "TKAD_CAMPAIGN_CONFIRMED",
  "TKAD_CAMPAIGN_TOMORROW",
  "TKAD_REPORT_READY",
];

type Props = {
  campaignId: string | null;
  defaultPhone?: string | null;
  defaultName?: string | null;
  campaignName?: string | null;
};

export function CampaignAlimtalkSend({
  campaignId,
  defaultPhone,
  defaultName,
  campaignName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [templateCode, setTemplateCode] =
    useState<AlimtalkTemplateCode>("TKAD_CAMPAIGN_TOMORROW");
  const [to, setTo] = useState("");
  const [recvName, setRecvName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setTo(defaultPhone?.trim() ?? "");
    setRecvName(defaultName?.trim() ?? "");
  }, [defaultPhone, defaultName, campaignId]);

  const send = useCallback(async () => {
    if (!campaignId) return;
    const label = ALIMTALK_TEMPLATE_LABELS[templateCode];
    const ok = window.confirm(
      `${label} 알림톡을 ${to.trim()} (${recvName.trim() || "이름 없음"})에게 발송할까요?`,
    );
    if (!ok) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/alimtalk`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateCode,
          to: to.trim() || undefined,
          recvName: recvName.trim() || undefined,
          campaignName: campaignName ?? undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        result?: { sent?: boolean; channel?: string; error?: string; detail?: string };
      };
      if (!res.ok) {
        setMsg(data.error ?? "발송 실패");
        return;
      }
      if (data.ok || data.result?.sent) {
        setMsg(
          data.result?.channel === "noop"
            ? "환경변수 미설정 — 서버 로그만 기록됨"
            : `발송 완료 (${data.result?.channel ?? "alimtalk"})`,
        );
      } else {
        setMsg(data.result?.error ?? data.result?.detail ?? "발송되지 않음");
      }
    } catch {
      setMsg("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }, [campaignId, templateCode, to, recvName, campaignName]);

  if (!campaignId) return null;

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/15 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MessageCircle className="h-4 w-4 text-[#FEE500]" />
          알림톡 발송
        </span>
        <span className="text-[10px] text-muted-foreground">
          {open ? "닫기" : "열기"}
        </span>
      </button>
      {open ? (
        <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
          <div>
            <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
              템플릿
            </label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={templateCode}
              onChange={(e) =>
                setTemplateCode(e.target.value as AlimtalkTemplateCode)
              }
            >
              {CAMPAIGN_TEMPLATES.map((code) => (
                <option key={code} value={code}>
                  {ALIMTALK_TEMPLATE_LABELS[code]} ({code})
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-muted-foreground">
              알리고에 동일 코드로 템플릿을 사전 등록해야 합니다.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                수신 번호
              </label>
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="01012345678"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                수신자 이름
              </label>
              <Input
                value={recvName}
                onChange={(e) => setRecvName(e.target.value)}
                placeholder="홍길동"
              />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={busy || !to.trim()}
            onClick={() => void send()}
            className="gap-1.5"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
            발송
          </Button>
          {msg ? (
            <p className="text-xs text-muted-foreground">{msg}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

