"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, Clock, Wallet } from "lucide-react";
import { PIPELINE_STAGE_LABEL } from "@/lib/crm-pipeline";
import type { SalesPipelineStage } from "@prisma/client";

const TAG_PRESETS = ["VIP", "재계약", "잠재고객"];

type TimelineItem = {
  id: string;
  type: "contact" | "note";
  kind: string;
  channel: string | null;
  body: string;
  at: string;
};

export default function AdminCustomerProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "ko";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    user: {
      id: string;
      email: string;
      name: string;
      phone: string | null;
      company: string | null;
    };
    account: {
      id: string;
      company: string;
      name: string;
      phone: string | null;
      assignedTo: string | null;
      pipelineStage: SalesPipelineStage;
      expectedAmountWon: number | null;
      tags: string[];
      tier: string;
      firstInquiryAt: string | null;
      lastContactAt: string | null;
    };
    lifetimeSpend: number;
    timeline: TimelineItem[];
  } | null>(null);

  const [assignedTo, setAssignedTo] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [expectedAmount, setExpectedAmount] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/crm/customers/${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "fail");
      setProfile(data);
      setAssignedTo(data.account.assignedTo ?? "");
      setTags(data.account.tags ?? []);
      setExpectedAmount(
        data.account.expectedAmountWon != null
          ? String(data.account.expectedAmountWon)
          : "",
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (patch: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/crm/customers/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error ?? "save failed");
    }
    await load();
  };

  const toggleTag = (t: string) => {
    setTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">로딩…</p>;
  }
  if (err || !profile) {
    return <p className="p-6 text-sm text-destructive">{err ?? "없음"}</p>;
  }

  const { user, account, lifetimeSpend, timeline } = profile;
  const stageLabel = PIPELINE_STAGE_LABEL[account.pipelineStage].ko;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/${locale}/admin/users`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            사용자 목록
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{account.company}</h1>
          <p className="text-muted-foreground text-sm">
            {account.name} · {user.email}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4" />
              기본 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>담당자: {account.name}</p>
            <p>연락처: {account.phone ?? user.phone ?? "—"}</p>
            <p>단계: {stageLabel}</p>
            <Badge variant="outline">{account.tier}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4" />
              집행 실적
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {lifetimeSpend.toLocaleString("ko-KR")}원
            </p>
            <p className="text-muted-foreground text-xs">누적 집행·결제 합계</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              접촉 이력
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              첫 문의:{" "}
              {account.firstInquiryAt
                ? new Date(account.firstInquiryAt).toLocaleDateString("ko-KR")
                : "—"}
            </p>
            <p>
              마지막 접촉:{" "}
              {account.lastContactAt
                ? new Date(account.lastContactAt).toLocaleDateString("ko-KR")
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">영업 담당 · 태그 · 예상 금액</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-xs"
              placeholder="담당 영업 (이메일)"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            />
            <Input
              className="max-w-[140px]"
              placeholder="예상 금액"
              value={expectedAmount}
              onChange={(e) => setExpectedAmount(e.target.value)}
            />
            <Button
              size="sm"
              onClick={() =>
                save({
                  assignedTo,
                  tags,
                  expectedAmountWon: expectedAmount
                    ? Number(expectedAmount)
                    : 0,
                  touchContact: true,
                })
              }
            >
              저장
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${locale}/admin/pipeline`}>파이프라인</Link>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {TAG_PRESETS.map((t) => (
              <Badge
                key={t}
                variant={tags.includes(t) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTag(t)}
              >
                {t}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">메모 · 타임라인</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="메모 추가"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button
              size="sm"
              disabled={!note.trim()}
              onClick={async () => {
                await save({ note: note.trim() });
                setNote("");
              }}
            >
              추가
            </Button>
          </div>
          <ul className="space-y-3 border-l-2 border-border pl-4">
            {timeline.map((item) => (
              <li key={item.id} className="relative text-sm">
                <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                <p className="text-muted-foreground text-xs">
                  {new Date(item.at).toLocaleString("ko-KR")} ·{" "}
                  {item.kind || item.type}
                  {item.channel ? ` · ${item.channel}` : ""}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap">{item.body}</p>
              </li>
            ))}
            {timeline.length === 0 ? (
              <p className="text-muted-foreground text-sm">기록 없음</p>
            ) : null}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
