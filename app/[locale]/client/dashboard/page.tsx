"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  CalendarClock,
  History,
  LineChart,
  LogOut,
  MapPin,
  MessageCircle,
  PencilLine,
  ChartPie,
  Radio,
  Send,
  User,
  Wallet,
  Zap,
} from "lucide-react";
import {
  CLIENT_SESSION_EMAIL_KEY,
  type Client,
  type Project,
  type ScheduleAlert,
  findClientByEmail,
  getDefaultDemoClient,
  statusMap,
} from "@/lib/client-portal-mock";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";
import { ClientMiniSparkline } from "@/components/client-mini-sparkline";

type ChatMessage = {
  id: string;
  from: "client" | "admin";
  text: string;
  time: string;
};

const initialChat: ChatMessage[] = [
  {
    id: "m0",
    from: "admin",
    time: "09:12",
    text: "안녕하세요, 담당 매니저입니다. 캠페인 관련 문의는 이 채팅으로 남겨 주세요.",
  },
];

function formatImp(n: number, isKo: boolean) {
  return n.toLocaleString(isKo ? "ko-KR" : "en-US");
}

export default function ClientDashboardPage() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const router = useRouter();
  const { toast } = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [liveImp, setLiveImp] = useState<Record<string, number>>({});
  const [impHistory, setImpHistory] = useState<Record<string, number[]>>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChat);
  const [chatInput, setChatInput] = useState("");
  const [modifyOpen, setModifyOpen] = useState(false);
  const [modifyProject, setModifyProject] = useState<Project | null>(null);
  const [modifyNote, setModifyNote] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startTransition(() => {
      const raw = localStorage.getItem(CLIENT_SESSION_EMAIL_KEY);
      const resolved = raw
        ? (findClientByEmail(raw) ?? getDefaultDemoClient())
        : getDefaultDemoClient();
      setClient(resolved);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!client) return;
    const inProgress = client.projects.filter(
      (p) => p.status === "in_progress" && p.metrics,
    );
    const bases: Record<string, number> = {};
    for (const p of inProgress) {
      bases[p.id] = p.metrics!.impressions;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial seed for live simulation
    setLiveImp((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(bases)) {
        if (next[id] === undefined) next[id] = bases[id];
      }
      return next;
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial seed for live simulation
    setImpHistory((prev) => {
      const nh = { ...prev };
      for (const p of inProgress) {
        const b = bases[p.id];
        if (!nh[p.id]?.length) {
          nh[p.id] = Array.from(
            { length: 14 },
            (_, i) => Math.max(0, b - (13 - i) * 18_000),
          );
        }
      }
      return nh;
    });

    if (inProgress.length === 0) return;

    const t = setInterval(() => {
      setLiveImp((live) => {
        const next = { ...live };
        for (const p of inProgress) {
          const id = p.id;
          const bump = Math.floor(Math.random() * 800) + 120;
          next[id] = (next[id] ?? bases[id]) + bump;
        }
        setImpHistory((h) => {
          const nh = { ...h };
          for (const p of inProgress) {
            const id = p.id;
            const arr = [...(nh[id] ?? [])];
            arr.push(next[id]!);
            if (arr.length > 20) arr.shift();
            nh[id] = arr;
          }
          return nh;
        });
        return next;
      });
    }, 4000);

    return () => clearInterval(t);
  }, [client]);

  useEffect(() => {
    if (chatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear unread when chat panel visible
      setChatUnread(0);
    }
  }, [chatMessages, chatOpen]);

  const activeProjects = useMemo(
    () => client?.projects.filter((p) => p.status !== "completed") ?? [],
    [client],
  );

  const historyProjects = useMemo(
    () => client?.projects.filter((p) => p.status === "completed") ?? [],
    [client],
  );

  const inProgressWithMetrics = useMemo(
    () =>
      client?.projects.filter((p) => p.status === "in_progress" && p.metrics) ??
      [],
    [client],
  );

  const budgetAggregate = useMemo(() => {
    if (!client) return { total: 0, spent: 0, items: [] as Project[] };
    const items = client.projects.filter((p) => p.budget);
    let total = 0;
    let spent = 0;
    for (const p of items) {
      total += p.budget!.totalMan;
      spent += p.budget!.spentMan;
    }
    return { total, spent, items };
  }, [client]);

  const totalLiveImpressions = useMemo(() => {
    let s = 0;
    for (const p of inProgressWithMetrics) {
      s += liveImp[p.id] ?? p.metrics!.impressions;
    }
    return s;
  }, [inProgressWithMetrics, liveImp]);

  const avgCtrLive = useMemo(() => {
    if (inProgressWithMetrics.length === 0) return null;
    const sum = inProgressWithMetrics.reduce(
      (a, p) => a + (p.metrics?.ctrPercent ?? 0),
      0,
    );
    return sum / inProgressWithMetrics.length;
  }, [inProgressWithMetrics]);

  const allAlerts = useMemo(() => {
    if (!client) return [] as { alert: ScheduleAlert; project: Project }[];
    const list: { alert: ScheduleAlert; project: Project }[] = [];
    for (const p of client.projects) {
      for (const a of p.alerts ?? []) {
        list.push({ alert: a, project: p });
      }
    }
    return list.sort((x, y) => x.alert.date.localeCompare(y.alert.date));
  }, [client]);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(CLIENT_SESSION_EMAIL_KEY);
    } catch {
      /* ignore */
    }
    router.push("/client");
  }, [router]);

  const openModify = (p: Project) => {
    setModifyProject(p);
    setModifyNote("");
    setModifyOpen(true);
  };

  const appendPreset = (line: string) => {
    setModifyNote((prev) =>
      prev.trim() ? `${prev.trim()}\n${line}` : line,
    );
  };

  const submitModify = () => {
    if (!modifyNote.trim()) {
      toast("warning", isKo ? "요청 내용을 입력해 주세요." : "Enter your request.");
      return;
    }
    toast(
      "success",
      isKo
        ? "수정 요청이 접수되었습니다. 담당자가 확인 후 연락드립니다."
        : "Change request received. Your manager will follow up.",
    );
    setModifyOpen(false);
    setModifyProject(null);
    setModifyNote("");
  };

  const sendChat = () => {
    const t = chatInput.trim();
    if (!t) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const id = `c-${now.getTime()}`;
    setChatMessages((m) => [...m, { id, from: "client", text: t, time }]);
    setChatInput("");
    setTimeout(() => {
      setChatMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          from: "admin",
          time,
          text: isKo
            ? "메시지 확인했습니다. 순차적으로 답변드리겠습니다."
            : "Thanks — we’ve received your message and will reply shortly.",
        },
      ]);
      if (!chatOpen) setChatUnread((u) => u + 1);
    }, 900);
  };

  const openChat = useCallback(() => setChatOpen(true), []);

  if (!hydrated || !client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-gold" />
      </div>
    );
  }

  const sessionEmail =
    typeof window !== "undefined"
      ? localStorage.getItem(CLIENT_SESSION_EMAIL_KEY)
      : null;

  const budgetPct =
    budgetAggregate.total > 0
      ? Math.min(100, (budgetAggregate.spent / budgetAggregate.total) * 100)
      : 0;

  const modifyPresets = isKo
    ? [
        "[일정] 집행 기간 연장/단축 요청",
        "[매체] 일부 면 교체 또는 추가 집행 요청",
        "[소재] 크리에이티브 수정·A/B 테스트 요청",
        "[리포트] 주간/월간 성과 리포트 형식 변경",
      ]
    : [
        "[Schedule] Extend or shorten the flight",
        "[Media] Swap or add placements",
        "[Creative] Update creative / A/B test",
        "[Reporting] Change report cadence or format",
      ];

  const chatPanel = (
    <>
      <SheetHeader>
        <SheetTitle className="text-navy">
          {isKo ? "1:1 담당자 채팅" : "1:1 account chat"}
        </SheetTitle>
        <p className="text-left text-xs text-muted-foreground">
          {isKo
            ? "집행·수정·일정 문의를 남기시면 담당 매니저가 확인합니다."
            : "Ask about delivery, changes, or schedules — your manager will respond."}
        </p>
      </SheetHeader>
      <div className="mt-4 flex flex-1 flex-col gap-3 overflow-hidden">
        <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/80 p-3">
          {chatMessages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[90%] rounded-2xl px-3 py-2 text-sm",
                m.from === "admin"
                  ? "mr-auto bg-white text-navy shadow-sm"
                  : "ml-auto bg-navy text-white",
              )}
            >
              <p>{m.text}</p>
              <p
                className={cn(
                  "mt-1 text-[10px] opacity-70",
                  m.from === "client" ? "text-right" : "",
                )}
              >
                {m.time}
              </p>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="flex gap-2">
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={
              isKo ? "메시지를 입력하세요…" : "Type a message…"
            }
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendChat();
              }
            }}
          />
          <Button
            type="button"
            className="btn-gold shrink-0"
            size="icon"
            onClick={sendChat}
            aria-label={isKo ? "전송" : "Send"}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {isKo
            ? "데모: 자동 응답만 제공됩니다. 실서비스에서는 담당 팀과 연동됩니다."
            : "Demo: auto-replies only. Production connects to your account team."}
        </p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <header className="border-b border-navy/10 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/client"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-navy hover:text-gold-dark"
            >
              <ArrowLeft className="h-4 w-4" />
              {isKo ? "포털" : "Portal"}
            </Link>
            <span className="hidden h-4 w-px bg-slate-200 sm:block" />
            <div>
              <h1 className="text-lg font-extrabold text-navy sm:text-xl">
                {isKo ? "캠페인 대시보드" : "Campaign dashboard"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {client.company} · {client.contactName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="touch-manipulation">
              <Link href="/client/monitoring">
                <MapPin className="mr-1.5 h-4 w-4 text-gold" />
                {isKo ? "실시간 지도" : "Live map"}
              </Link>
            </Button>
            <Sheet open={chatOpen} onOpenChange={setChatOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="relative touch-manipulation rounded-full border-gold/40"
                >
                  <MessageCircle className="mr-1.5 h-4 w-4 text-gold" />
                  {isKo ? "1:1 채팅" : "Chat"}
                  {chatUnread > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cta px-1 text-[9px] font-bold text-white">
                      {chatUnread > 9 ? "9+" : chatUnread}
                    </span>
                  ) : null}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
                {chatPanel}
              </SheetContent>
            </Sheet>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={logout}
            >
              <LogOut className="mr-1.5 h-4 w-4" />
              {isKo ? "나가기" : "Exit"}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        {!sessionEmail && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {isKo
              ? "로그인 세션이 없어 데모 계정 데이터를 표시합니다. 포털에서 로그인하면 동일 이메일 기준으로 연동됩니다."
              : "No portal session — showing demo data. Log in at the client portal to sync by email."}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-navy/10 shadow-md sm:col-span-2 xl:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-navy">
                <Zap className="h-4 w-4 text-amber-500" />
                {isKo ? "실시간 누적 노출" : "Live impressions"}
              </CardTitle>
              <CardDescription className="text-[11px]">
                {isKo ? "집행 중 캠페인 합산 (데모 시뮬.)" : "Sum of live campaigns (demo)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-extrabold tabular-nums text-navy">
                {formatImp(totalLiveImpressions, isKo)}
              </p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600">
                <Radio className="h-3 w-3 animate-pulse" />
                {isKo ? "4초마다 갱신" : "Updates every 4s"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-navy/10 shadow-md sm:col-span-2 xl:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-navy">
                <BarChart3 className="h-4 w-4 text-gold" />
                {isKo ? "평균 CTR (진행)" : "Avg. CTR (live)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-extrabold tabular-nums text-gold-dark">
                {avgCtrLive != null ? `${avgCtrLive.toFixed(2)}%` : "—"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {isKo ? "집행 중 캠페인 기준" : "Across in-flight campaigns"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-navy/10 shadow-md sm:col-span-2 xl:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-navy">
                <ChartPie className="h-4 w-4 text-gold" />
                {isKo ? "예산 사용률" : "Budget used"}
              </CardTitle>
              <CardDescription className="text-[11px]">
                {isKo ? "등록된 모든 캠페인 예산" : "All budgeted projects"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-extrabold tabular-nums text-navy">
                {budgetPct.toFixed(1)}%
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-navy to-gold transition-all duration-500"
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatImp(budgetAggregate.spent, isKo)} /{" "}
                {formatImp(budgetAggregate.total, isKo)}
                {isKo ? "만원" : " (₩10K)"}
              </p>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-center border-gold/25 bg-gradient-to-br from-navy/5 to-gold/10 shadow-md sm:col-span-2 xl:col-span-1">
            <CardContent className="flex flex-col gap-2 p-4">
              <p className="text-sm font-bold text-navy">
                {isKo ? "견적·집행 문의" : "Quotes & delivery"}
              </p>
              <Button className="btn-gold w-full rounded-full font-semibold" onClick={openChat}>
                <MessageCircle className="mr-2 h-4 w-4" />
                {isKo ? "1:1 채팅 열기" : "Open chat"}
              </Button>
            </CardContent>
          </Card>
        </section>

        {budgetAggregate.items.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-gold" />
              <h2 className="text-base font-bold text-navy sm:text-lg">
                {isKo ? "캠페인별 예산 사용 현황" : "Budget by campaign"}
              </h2>
            </div>
            <Card className="border-navy/10">
              <CardContent className="divide-y divide-slate-100 p-0">
                {budgetAggregate.items.map((p) => {
                  const b = p.budget!;
                  const pct = Math.min(100, (b.spentMan / b.totalMan) * 100);
                  return (
                    <div
                      key={p.id}
                      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-navy">{p.title}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {p.id}
                        </p>
                      </div>
                      <div className="w-full max-w-md shrink-0">
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                          <span>
                            {formatImp(b.spentMan, isKo)} / {formatImp(b.totalMan, isKo)}
                            {isKo ? "만원" : ""}
                          </span>
                          <span className="tabular-nums font-medium text-navy">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-navy to-gold"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </section>
        )}

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Radio className="h-5 w-5 animate-pulse text-emerald-500" />
            <h2 className="text-base font-bold text-navy sm:text-lg">
              {isKo ? "캠페인 실시간 성과" : "Live campaign performance"}
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {activeProjects.map((p) => {
              const st = statusMap[p.status];
              const imp =
                p.status === "in_progress" && p.metrics
                  ? liveImp[p.id] ?? p.metrics.impressions
                  : null;
              const spark = impHistory[p.id] ?? [];
              return (
                <Card key={p.id} className="border-navy/10 shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {p.id}
                        </p>
                        <CardTitle className="text-base text-navy">
                          {p.title}
                        </CardTitle>
                      </div>
                      <Badge className={cn("border-0", st.className)}>
                        {isKo ? st.labelKo : st.labelEn}
                      </Badge>
                    </div>
                    <CardDescription>{p.summary}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {p.status === "in_progress" && p.metrics && imp !== null ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-navy/5 p-3">
                          <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                            <LineChart className="h-3.5 w-3.5 text-gold" />
                            {isKo ? "누적 노출 (실시간)" : "Impressions (live)"}
                          </p>
                          <p className="mt-1 text-xl font-extrabold tabular-nums text-navy">
                            {formatImp(imp, isKo)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            +{formatImp(p.metrics.impressionsPerDay, isKo)}{" "}
                            {isKo ? "/ 일 추정 증가" : "/ day est."}
                          </p>
                          <div className="mt-2 border-t border-slate-200/80 pt-2">
                            <p className="mb-1 text-[10px] font-medium text-muted-foreground">
                              {isKo ? "노출 추이" : "Trend"}
                            </p>
                            <ClientMiniSparkline values={spark} />
                          </div>
                        </div>
                        <div className="rounded-xl bg-navy/5 p-3">
                          <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                            <BarChart3 className="h-3.5 w-3.5 text-gold" />
                            CTR
                          </p>
                          <p className="mt-1 text-xl font-extrabold tabular-nums text-gold-dark">
                            {p.metrics.ctrPercent.toFixed(2)}%
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {isKo
                              ? p.metrics.ctrTrendKo
                              : p.metrics.ctrTrendEn}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-muted-foreground">
                        {isKo
                          ? "집행이 시작되면 노출·CTR이 실시간으로 집계됩니다."
                          : "Impressions and CTR will appear once the campaign is live."}
                      </div>
                    )}

                    {p.budget && (
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs font-medium text-navy">
                          <span className="inline-flex items-center gap-1">
                            <Wallet className="h-3.5 w-3.5 text-gold" />
                            {isKo ? "이 캠페인 예산" : "This campaign budget"}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {formatImp(p.budget.spentMan, isKo)} /{" "}
                            {formatImp(p.budget.totalMan, isKo)}
                            {isKo ? "만원" : " (₩10K)"}
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-navy to-gold transition-all duration-500"
                            style={{
                              width: `${Math.min(
                                100,
                                (p.budget.spentMan / p.budget.totalMan) * 100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full border-navy/20"
                        onClick={() => openModify(p)}
                      >
                        <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                        {isKo ? "캠페인 수정 요청" : "Request changes"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-navy hover:bg-navy/5"
                        onClick={openChat}
                      >
                        <MessageCircle className="mr-1.5 h-3.5 w-3.5 text-gold" />
                        {isKo ? "담당자 채팅" : "Chat manager"}
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-[11px] text-muted-foreground">
                      <User className="h-3.5 w-3.5 text-gold" />
                      <span>
                        {p.manager.name} · {p.manager.email}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {activeProjects.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {isKo ? "진행 중인 캠페인이 없습니다." : "No active campaigns."}
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-gold" />
            <h2 className="text-base font-bold text-navy sm:text-lg">
              {isKo ? "캠페인 일정 알림" : "Schedule & reminders"}
            </h2>
          </div>
          <Card className="border-navy/10">
            <CardContent className="p-0">
              {allAlerts.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  {isKo ? "등록된 일정 알림이 없습니다." : "No upcoming milestones."}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {allAlerts.map(({ alert, project }) => (
                    <li
                      key={`${project.id}-${alert.id}`}
                      className="flex flex-wrap items-start gap-3 px-4 py-3 sm:px-6"
                    >
                      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-navy">
                          {isKo ? alert.titleKo : alert.titleEn}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {alert.date} · {project.id}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <History className="h-5 w-5 text-navy" />
            <h2 className="text-base font-bold text-navy sm:text-lg">
              {isKo ? "과거 캠페인 히스토리" : "Past campaigns"}
            </h2>
          </div>
          <Card className="border-navy/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 sm:px-6">{isKo ? "프로젝트" : "Project"}</th>
                    <th className="px-4 py-3">{isKo ? "기간" : "Period"}</th>
                    <th className="px-4 py-3">{isKo ? "노출" : "Impressions"}</th>
                    <th className="px-4 py-3">CTR</th>
                    <th className="px-4 py-3 sm:px-6">{isKo ? "집행액" : "Spend"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 sm:px-6">
                        <p className="font-medium text-navy">{p.title}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {p.id}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.createdAt} – {p.updatedAt}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {p.historyMetrics
                          ? formatImp(p.historyMetrics.impressions, isKo)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {p.historyMetrics
                          ? `${p.historyMetrics.ctrPercent.toFixed(2)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums sm:px-6">
                        {p.historyMetrics
                          ? `${formatImp(p.historyMetrics.budgetMan, isKo)}${isKo ? "만원" : ""}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {historyProjects.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">
                {isKo ? "완료된 캠페인이 없습니다." : "No completed campaigns yet."}
              </p>
            )}
          </Card>
        </section>
      </div>

      <button
        type="button"
        onClick={openChat}
        className="fixed bottom-6 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-navy text-white shadow-lg transition-transform hover:scale-105 sm:hidden"
        aria-label={isKo ? "1:1 채팅" : "Open chat"}
      >
        <MessageCircle className="h-6 w-6" />
        {chatUnread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-cta px-1 text-[10px] font-bold">
            {chatUnread > 9 ? "9+" : chatUnread}
          </span>
        ) : null}
      </button>

      <Modal
        open={modifyOpen}
        onClose={() => setModifyOpen(false)}
        ariaLabel={isKo ? "캠페인 수정 요청" : "Campaign change request"}
      >
        <div className="max-h-[85vh] w-[min(100vw-2rem,480px)] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
          <h3 className="text-lg font-bold text-navy">
            {isKo ? "캠페인 수정 요청" : "Request campaign changes"}
          </h3>
          {modifyProject && (
            <p className="mt-1 text-sm text-muted-foreground">
              {modifyProject.title}{" "}
              <span className="font-mono">({modifyProject.id})</span>
            </p>
          )}
          <p className="mt-3 text-xs font-medium text-navy">
            {isKo ? "빠른 선택 (필요 시 여러 개)" : "Quick inserts"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {modifyPresets.map((line) => (
              <Button
                key={line}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto max-w-full whitespace-normal rounded-xl border-navy/15 px-3 py-2 text-left text-[11px] leading-snug"
                onClick={() => appendPreset(line)}
              >
                {line}
              </Button>
            ))}
          </div>
          <Textarea
            className="mt-4 min-h-32 border-navy/15"
            value={modifyNote}
            onChange={(e) => setModifyNote(e.target.value)}
            placeholder={
              isKo
                ? "변경을 원하는 일정, 매체, 소재 등을 구체적으로 적어 주세요."
                : "Describe schedule, media, creative, or other changes."
            }
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModifyOpen(false)}>
              {isKo ? "취소" : "Cancel"}
            </Button>
            <Button className="btn-gold" onClick={submitModify}>
              {isKo ? "요청 보내기" : "Submit"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
