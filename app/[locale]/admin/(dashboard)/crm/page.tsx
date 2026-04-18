"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  repurchaseLikelihood,
  segmentCustomer,
  segmentRationaleKeys,
  type CrmScoringInput,
  type CustomerSegment,
  type SegmentRationaleKey,
} from "@/lib/crm-scoring";
import {
  Brain,
  Gauge,
  Mail,
  RefreshCw,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";
import Spinner from "@/components/spinner";

type TabId = "dashboard" | "leads" | "intelligence" | "automation";

type CrmLeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

// ── API types ─────────────────────────────────────────────────────────────────

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
};

type AccountRow = {
  id: string;
  email: string;
  company: string;
  name: string;
  phone: string | null;
  tier: "vip" | "standard" | "lead";
  updatedAt: string;
  _count: { contactLogs: number; notes: number; followUps: number };
  campaigns: CampaignRow[];
};

type InquiryRow = {
  id: string;
  company: string;
  name: string;
  phone: string;
  email: string | null;
  budget: string | null;
  status: "pending" | "processing" | "completed";
  createdAt: string;
};

type LeadWithStage = InquiryRow & { stage: CrmLeadStage };

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapStatusToStage(status: string): CrmLeadStage {
  if (status === "completed") return "won";
  if (status === "processing") return "contacted";
  return "new";
}

function tierToBudgetTier(tier: string): 1 | 2 | 3 | 4 {
  if (tier === "vip") return 4;
  if (tier === "standard") return 2;
  return 1;
}

function buildScoringInput(account: AccountRow): CrmScoringInput {
  const completed = account.campaigns.filter((c) => c.status === "completed");
  const lastEnd =
    completed
      .map((c) => (c.endDate ? new Date(c.endDate).getTime() : 0))
      .sort((a, b) => b - a)[0] ?? 0;
  const daysSinceLastCampaignEnd =
    lastEnd > 0
      ? Math.max(0, Math.round((Date.now() - lastEnd) / 86_400_000))
      : 730;
  return {
    budgetTier: tierToBudgetTier(account.tier),
    totalCampaigns: account.campaigns.length,
    completedCampaigns: completed.length,
    ctrVsBenchmark: 1.0,
    daysSinceLastCampaignEnd,
  };
}

function campaignStatusMeta(status: string): { label: string; className: string } {
  const MAP: Record<string, { label: string; className: string }> = {
    airing:      { label: "집행중",  className: "bg-emerald-100 text-emerald-800" },
    production:  { label: "제작",    className: "bg-blue-100 text-blue-800" },
    completed:   { label: "완료",    className: "bg-slate-100 text-slate-700" },
    contract:    { label: "계약",    className: "bg-violet-100 text-violet-800" },
    negotiation: { label: "협의",    className: "bg-amber-100 text-amber-800" },
    proposal:    { label: "제안",    className: "bg-sky-100 text-sky-800" },
  };
  return MAP[status] ?? { label: status, className: "bg-slate-100 text-slate-700" };
}

function segmentBadgeClass(segment: CustomerSegment) {
  if (segment === "high_value") return "bg-gold/20 text-navy border-gold/40";
  if (segment === "potential") return "bg-blue-50 text-blue-800 border-blue-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ko-KR");
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminCrmPage() {
  const t = useTranslations("adminCrm");
  const locale = useLocale();
  const isKo = locale === "ko";
  const { toast } = useToast();

  const [tab, setTab] = useState<TabId>("dashboard");

  // Accounts
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("");

  // Leads (inquiries)
  const [leads, setLeads] = useState<LeadWithStage[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadSearch, setLeadSearch] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState("");

  const [autoSchedule, setAutoSchedule] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [segmentRunAt, setSegmentRunAt] = useState<string | null>(null);
  const [segmentRefreshing, setSegmentRefreshing] = useState(false);

  useEffect(() => {
    void (async () => {
      setAccountsLoading(true);
      setDbError(null);
      try {
        const res = await fetch("/api/admin/crm/accounts");
        if (res.status === 503) {
          setDbError("DATABASE_URL이 설정되지 않았습니다. .env에 DATABASE_URL을 추가하세요.");
          return;
        }
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as { accounts: AccountRow[] };
        setAccounts(data.accounts);
        if (data.accounts.length > 0) setAccountId(data.accounts[0].id);
      } catch (e) {
        setDbError(String(e));
      } finally {
        setAccountsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      setLeadsLoading(true);
      try {
        const res = await fetch("/api/admin/inquiries?limit=100");
        if (!res.ok) return;
        const data = (await res.json()) as { items: InquiryRow[] };
        const mapped: LeadWithStage[] = data.items.map((i) => ({
          ...i,
          stage: mapStatusToStage(i.status),
        }));
        setLeads(mapped);
        if (mapped.length > 0) setSelectedLeadId(mapped[0].id);
      } catch {
        /* silent */
      } finally {
        setLeadsLoading(false);
      }
    })();
  }, []);

  const account = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? accounts[0],
    [accounts, accountId],
  );

  const dashboardStats = useMemo(() => {
    if (!account) return { total: 0, active: 0, completed: 0 };
    return {
      total: account.campaigns.length,
      active: account.campaigns.filter(
        (c) => c.status === "airing" || c.status === "production",
      ).length,
      completed: account.campaigns.filter((c) => c.status === "completed").length,
    };
  }, [account]);

  const completedRows = useMemo(() => {
    const rows: { account: AccountRow; campaign: CampaignRow }[] = [];
    for (const acc of accounts) {
      for (const cp of acc.campaigns) {
        if (cp.status === "completed") rows.push({ account: acc, campaign: cp });
      }
    }
    return rows;
  }, [accounts]);

  const intelligenceRows = useMemo(
    () =>
      accounts.map((acc) => {
        const input = buildScoringInput(acc);
        return {
          account: acc,
          segment: segmentCustomer(input),
          repurchase: repurchaseLikelihood(input),
          rationaleKeys: segmentRationaleKeys(input) as SegmentRationaleKey[],
        };
      }),
    [accounts],
  );

  const filteredLeads = useMemo(() => {
    const q = leadSearch.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.company.toLowerCase().includes(q) ||
        l.name.toLowerCase().includes(q),
    );
  }, [leads, leadSearch]);

  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? leads[0];

  const updateLeadStage = useCallback((id: string, stage: CrmLeadStage) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)));
  }, []);

  const postCrmEmail = useCallback(
    async (payload: {
      kind: "auto_reply" | "feedback_request";
      to: string;
      company: string;
      contactName?: string;
      campaignName?: string;
    }) => {
      const res = await fetch("/api/admin/crm/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, locale, website: "" }),
      });
      return (await res.json()) as { ok?: boolean; sent?: boolean; code?: string };
    },
    [locale],
  );

  const sendCrmEmail = useCallback(
    async (
      key: string,
      payload: {
        kind: "auto_reply" | "feedback_request";
        to: string;
        company: string;
        contactName?: string;
        campaignName?: string;
      },
    ) => {
      setSending(key);
      try {
        const data = await postCrmEmail(payload);
        if (data.code === "EMAIL_DISABLED" || data.code === "SMTP_DISABLED") {
          toast("warning", t("smtpSkipped"));
        } else if (data.sent) {
          toast("success", t("smtpSent"));
        } else {
          toast("error", t("smtpFailed"));
        }
      } catch {
        toast("error", t("smtpFailed"));
      } finally {
        setSending(null);
      }
    },
    [postCrmEmail, t, toast],
  );

  const sendBatchFeedbackEmails = useCallback(async () => {
    if (completedRows.length === 0) return;
    setSending("batch-feedback");
    let sent = 0;
    try {
      for (const { account: acc, campaign: cp } of completedRows) {
        const data = await postCrmEmail({
          kind: "feedback_request",
          to: acc.email,
          company: acc.company,
          contactName: acc.name,
          campaignName: cp.name,
        });
        if (data.code === "EMAIL_DISABLED" || data.code === "SMTP_DISABLED") {
          toast("warning", t("smtpSkipped"));
          setSending(null);
          return;
        }
        if (data.sent) sent += 1;
      }
      toast("success", t("batchFeedbackResult", { sent, total: completedRows.length }));
    } catch {
      toast("error", t("smtpFailed"));
    } finally {
      setSending(null);
    }
  }, [completedRows, postCrmEmail, t, toast]);

  const refreshSegmentation = useCallback(() => {
    setSegmentRefreshing(true);
    window.setTimeout(() => {
      setSegmentRunAt(new Date().toISOString());
      setSegmentRefreshing(false);
      toast("success", t("segmentRefreshed"));
    }, 600);
  }, [t, toast]);

  const stageLabel = (s: CrmLeadStage) =>
    ({
      new: t("stages.new"),
      contacted: t("stages.contacted"),
      qualified: t("stages.qualified"),
      proposal: t("stages.proposal"),
      negotiation: t("stages.negotiation"),
      won: t("stages.won"),
      lost: t("stages.lost"),
    })[s];

  const tabs: { id: TabId; icon: typeof Gauge }[] = [
    { id: "dashboard", icon: Gauge },
    { id: "leads", icon: Users },
    { id: "intelligence", icon: Brain },
    { id: "automation", icon: Zap },
  ];

  if (dbError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-sm font-semibold text-rose-600">DB 연결 필요</p>
          <p className="max-w-md text-xs text-muted-foreground">{dbError}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {tabs.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              tab === id
                ? "bg-navy text-white"
                : "bg-slate-100 text-muted-foreground hover:bg-slate-200",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {id === "dashboard" && t("tabDashboard")}
            {id === "leads" && t("tabLeads")}
            {id === "intelligence" && t("tabIntelligence")}
            {id === "automation" && t("tabAutomation")}
          </button>
        ))}
      </div>

      {/* ── Dashboard ─────────────────────────────────────────────────────── */}
      {tab === "dashboard" && (
        <div className="space-y-4">
          {accountsLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Spinner className="h-6 w-6" />
              </CardContent>
            </Card>
          ) : accounts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                등록된 고객 계정이 없습니다.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t("pickCustomer")}
                    </label>
                    <select
                      className="h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.company} ({a.name})
                        </option>
                      ))}
                    </select>
                  </div>
                  {account && (
                    <div className="flex flex-wrap gap-3">
                      {[
                        { label: "총 캠페인", value: dashboardStats.total },
                        { label: t("activeCampaigns"), value: dashboardStats.active },
                        { label: "완료", value: dashboardStats.completed },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg border bg-white px-3 py-2">
                          <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
                          <p className="text-lg font-bold text-navy">{value}</p>
                        </div>
                      ))}
                      <div className="rounded-lg border bg-white px-3 py-2">
                        <p className="text-[10px] font-medium uppercase text-muted-foreground">등급</p>
                        <p className="text-lg font-bold uppercase text-navy">{account.tier}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {account && (
                <>
                  {/* Budget comparison */}
                  {account.campaigns.some((c) => (c.budgetMax ?? 0) > 0) && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{t("performanceCompareTitle")}</CardTitle>
                        <p className="text-xs text-muted-foreground">예산 기준 캠페인 비교</p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {(() => {
                          const maxB = Math.max(...account.campaigns.map((c) => c.budgetMax ?? 0));
                          return account.campaigns
                            .filter((c) => (c.budgetMax ?? 0) > 0)
                            .map((cp) => {
                              const pct = maxB > 0 ? Math.round(((cp.budgetMax ?? 0) / maxB) * 100) : 0;
                              return (
                                <div key={cp.id}>
                                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-xs">
                                    <span className="font-medium text-navy">{cp.name}</span>
                                    <span className="text-muted-foreground">
                                      {cp.budgetMax ? `₩${cp.budgetMax.toLocaleString()}` : "—"}
                                    </span>
                                  </div>
                                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-navy to-gold"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            });
                        })()}
                      </CardContent>
                    </Card>
                  )}

                  {/* Campaign cards */}
                  {account.campaigns.length > 0 ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {account.campaigns.map((cp) => {
                        const { label, className } = campaignStatusMeta(cp.status);
                        return (
                          <Card key={cp.id}>
                            <CardHeader className="pb-2">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <CardTitle className="text-base leading-snug">{cp.name}</CardTitle>
                                <Badge variant="outline" className={cn("shrink-0", className)}>
                                  {label}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {fmtDate(cp.startDate)} — {fmtDate(cp.endDate)}
                              </p>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground">
                                예산:{" "}
                                <span className="font-medium text-navy">
                                  {cp.budgetMin || cp.budgetMax
                                    ? `₩${(cp.budgetMin ?? 0).toLocaleString()} — ₩${(cp.budgetMax ?? 0).toLocaleString()}`
                                    : "—"}
                                </span>
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center text-sm text-muted-foreground">
                        이 고객의 캠페인이 없습니다.
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Leads ─────────────────────────────────────────────────────────── */}
      {tab === "leads" && (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">{t("tabLeads")}</CardTitle>
            <Input
              className="max-w-xs"
              placeholder={isKo ? "회사·담당자 검색" : "Search company or contact"}
              value={leadSearch}
              onChange={(e) => setLeadSearch(e.target.value)}
            />
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {leadsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="h-6 w-6" />
              </div>
            ) : filteredLeads.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {leadSearch ? "검색 결과가 없습니다." : "문의 내역이 없습니다."}
              </p>
            ) : (
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-3 pr-3">{t("company")}</th>
                    <th className="pb-3 pr-3">{t("contact")}</th>
                    <th className="hidden pb-3 pr-3 md:table-cell">{t("email")}</th>
                    <th className="pb-3 pr-3">{t("leadValue")}</th>
                    <th className="pb-3 pr-3">{t("lastTouch")}</th>
                    <th className="pb-3">{t("leadStage")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((l) => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="py-3 pr-3 font-medium text-navy">{l.company}</td>
                      <td className="py-3 pr-3 text-muted-foreground">{l.name}</td>
                      <td className="hidden py-3 pr-3 text-muted-foreground md:table-cell">
                        {l.email ?? "—"}
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">{l.budget ?? "—"}</td>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {new Date(l.createdAt).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="py-3">
                        <select
                          className="h-9 max-w-[140px] rounded-md border border-input bg-background px-2 text-xs"
                          value={l.stage}
                          onChange={(e) => updateLeadStage(l.id, e.target.value as CrmLeadStage)}
                        >
                          {(
                            [
                              "new",
                              "contacted",
                              "qualified",
                              "proposal",
                              "negotiation",
                              "won",
                              "lost",
                            ] as const
                          ).map((s) => (
                            <option key={s} value={s}>
                              {stageLabel(s)}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Intelligence ──────────────────────────────────────────────────── */}
      {tab === "intelligence" && (
        <div className="space-y-4">
          <Card className="border-dashed border-gold/40 bg-gold/5">
            <CardContent className="flex gap-3 py-4">
              <Sparkles className="h-5 w-5 shrink-0 text-gold" />
              <p className="text-sm text-navy/90">{t("modelNote")}</p>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-navy">{t("aiSegmentationTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("aiSegmentationDesc")}</p>
              {segmentRunAt && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {t("segmentLastRun", {
                    time: new Date(segmentRunAt).toLocaleString(isKo ? "ko-KR" : "en-US"),
                  })}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-navy/20"
              disabled={segmentRefreshing}
              onClick={refreshSegmentation}
            >
              {segmentRefreshing ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {t("segmentRunning")}
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t("segmentRefresh")}
                </>
              )}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-gold" />
                {t("tabIntelligence")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{t("segmentHint")}</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {accountsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner className="h-6 w-6" />
                </div>
              ) : accounts.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  등록된 고객 계정이 없습니다.
                </p>
              ) : (
                <table className="w-full min-w-[880px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                      <th className="pb-3 pr-3">{t("company")}</th>
                      <th className="pb-3 pr-3">{t("segmentColumn")}</th>
                      <th className="min-w-[220px] pb-3 pr-3">{t("rationaleColumn")}</th>
                      <th className="pb-3 pr-3">{t("repurchase")}</th>
                      <th className="pb-3">{t("repurchaseScore")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intelligenceRows.map(({ account: acc, segment, repurchase, rationaleKeys }) => (
                      <tr key={acc.id} className="border-b last:border-0">
                        <td className="py-3 pr-3 align-top font-medium text-navy">
                          {acc.company}
                        </td>
                        <td className="py-3 pr-3 align-top">
                          <Badge
                            variant="outline"
                            className={cn("font-semibold", segmentBadgeClass(segment))}
                          >
                            {segment === "high_value" && t("segmentHigh")}
                            {segment === "potential" && t("segmentPotential")}
                            {segment === "standard" && t("segmentStandard")}
                          </Badge>
                        </td>
                        <td className="py-3 pr-3 align-top">
                          <ul className="max-w-xs list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                            {rationaleKeys.map((k) => (
                              <li key={k}>{t(k)}</li>
                            ))}
                          </ul>
                        </td>
                        <td className="py-3 pr-3 align-top text-muted-foreground">
                          {t(repurchase.labelKey)}
                        </td>
                        <td className="py-3 align-top">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-navy"
                                style={{ width: `${repurchase.score}%` }}
                              />
                            </div>
                            <span className="font-semibold text-navy">{repurchase.score}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Automation ────────────────────────────────────────────────────── */}
      {tab === "automation" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-4 w-4 text-gold" />
                  {t("autoReplyTitle")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{t("autoReplyDesc")}</p>
              </CardHeader>
              <CardContent className="relative space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("selectLead")}
                  </label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedLeadId}
                    onChange={(e) => setSelectedLeadId(e.target.value)}
                    disabled={leads.length === 0}
                  >
                    {leads.length === 0 ? (
                      <option value="">문의 없음</option>
                    ) : (
                      leads.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.company} — {l.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                {/* honeypot */}
                <div className="pointer-events-none absolute left-0 top-0 h-px w-px overflow-hidden opacity-0" aria-hidden>
                  <label htmlFor="crm-hp-auto">Company website</label>
                  <input id="crm-hp-auto" tabIndex={-1} autoComplete="off" name="website" />
                </div>
                <Button
                  type="button"
                  className="w-full bg-navy hover:bg-navy/90"
                  disabled={
                    !selectedLead ||
                    !selectedLead.email ||
                    sending === "auto" ||
                    sending === "batch-feedback"
                  }
                  onClick={() => {
                    if (!selectedLead?.email) return;
                    void sendCrmEmail("auto", {
                      kind: "auto_reply",
                      to: selectedLead.email,
                      company: selectedLead.company,
                      contactName: selectedLead.name,
                    });
                  }}
                >
                  {sending === "auto" ? t("sending") : t("sendAutoReply")}
                </Button>
                {selectedLead && !selectedLead.email && (
                  <p className="text-xs text-amber-600">이메일 주소가 없어 발송할 수 없습니다.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("autoScheduleTitle")}</CardTitle>
                <p className="text-sm text-muted-foreground">{t("autoScheduleDesc")}</p>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  variant={autoSchedule ? "default" : "outline"}
                  className={autoSchedule ? "bg-gold text-navy hover:bg-gold/90" : ""}
                  onClick={() => setAutoSchedule((v) => !v)}
                >
                  {autoSchedule ? t("scheduleOff") : t("scheduleOn")}
                </Button>
                {autoSchedule && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t("scheduledBadge")}: {completedRows.length}{" "}
                    {isKo ? "건이 세션에 표시됩니다." : "rows in this session."}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("feedbackTitle")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("feedbackDesc")}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {completedRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noEnded")}</p>
              ) : (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      {t("batchFeedbackHint", { count: completedRows.length })}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0 bg-gold font-semibold text-navy hover:bg-gold-dark"
                      disabled={sending !== null}
                      onClick={() => void sendBatchFeedbackEmails()}
                    >
                      {sending === "batch-feedback" ? (
                        <>
                          <Spinner className="mr-2 h-4 w-4" />
                          {t("sending")}
                        </>
                      ) : (
                        t("sendBatchFeedback")
                      )}
                    </Button>
                  </div>
                  {autoSchedule && (
                    <p className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-navy/90">
                      {t("autoFeedbackQueueNote", { count: completedRows.length })}
                    </p>
                  )}
                  <ul className="space-y-2">
                    {completedRows.map(({ account: acc, campaign: cp }) => (
                      <li
                        key={`${acc.id}-${cp.id}`}
                        className="flex flex-col gap-2 rounded-lg border bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-navy">
                            {acc.company} · {cp.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {fmtDate(cp.endDate)}
                            {autoSchedule && (
                              <Badge variant="secondary" className="ml-2 text-[10px]">
                                {t("scheduledBadge")}
                              </Badge>
                            )}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 border-gold/40"
                          disabled={
                            sending === `${acc.id}-${cp.id}` ||
                            sending === "batch-feedback"
                          }
                          onClick={() =>
                            void sendCrmEmail(`${acc.id}-${cp.id}`, {
                              kind: "feedback_request",
                              to: acc.email,
                              company: acc.company,
                              contactName: acc.name,
                              campaignName: cp.name,
                            })
                          }
                        >
                          {sending === `${acc.id}-${cp.id}` ? t("sending") : t("sendFeedback")}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
