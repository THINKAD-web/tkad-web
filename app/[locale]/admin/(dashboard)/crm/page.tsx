"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  demoCustomers,
  enrichCustomerRow,
  initialLeads,
  type CrmCampaign,
  type CrmCustomer,
  type CrmLead,
  type CrmLeadStage,
} from "@/lib/crm-demo-data";
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

function campaignStatusClass(status: CrmCampaign["status"]) {
  if (status === "active") return "bg-emerald-100 text-emerald-800";
  if (status === "ended") return "bg-slate-100 text-slate-700";
  return "bg-amber-100 text-amber-800";
}

function segmentBadgeClass(segment: "high_value" | "potential" | "standard") {
  if (segment === "high_value") return "bg-gold/20 text-navy border-gold/40";
  if (segment === "potential") return "bg-blue-50 text-blue-800 border-blue-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function AdminCrmPage() {
  const t = useTranslations("adminCrm");
  const locale = useLocale();
  const isKo = locale === "ko";
  const { toast } = useToast();

  const [tab, setTab] = useState<TabId>("dashboard");
  const [customerId, setCustomerId] = useState(demoCustomers[0]?.id ?? "");
  const [leads, setLeads] = useState<CrmLead[]>(initialLeads);
  const [leadSearch, setLeadSearch] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState(initialLeads[0]?.id ?? "");
  const [autoSchedule, setAutoSchedule] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [segmentRunAt, setSegmentRunAt] = useState<string | null>(null);
  const [segmentRefreshing, setSegmentRefreshing] = useState(false);

  const customer = useMemo(
    () => demoCustomers.find((c) => c.id === customerId) ?? demoCustomers[0]!,
    [customerId],
  );

  const companyLabel = (c: CrmCustomer) => (isKo ? c.company : c.companyEn);
  const campaignName = (cp: CrmCampaign) => (isKo ? cp.name : (cp.nameEn || cp.name));

  const dashboardStats = useMemo(() => {
    const list = customer.campaigns.filter((c) => c.status !== "scheduled");
    const totalImp = list.reduce((s, c) => s + c.impressions, 0);
    const totalSpendMillion = list.reduce((s, c) => s + c.spendMillion, 0);
    const active = customer.campaigns.filter((c) => c.status === "active").length;
    const ended = customer.campaigns.filter((c) => c.status === "ended");
    const avgRatio =
      ended.length > 0
        ? ended.reduce((s, c) => s + c.ctr / c.ctrBenchmark, 0) / ended.length
        : 0;
    return { totalImp, totalSpendMillion, active, avgRatio };
  }, [customer]);

  const dashboardCompareCampaigns = useMemo(
    () => customer.campaigns.filter((c) => c.status !== "scheduled"),
    [customer],
  );

  const endedRows = useMemo(() => {
    const rows: {
      customer: CrmCustomer;
      campaign: CrmCampaign;
    }[] = [];
    for (const c of demoCustomers) {
      for (const cp of c.campaigns) {
        if (cp.status === "ended") rows.push({ customer: c, campaign: cp });
      }
    }
    return rows;
  }, []);

  const intelligenceRows = useMemo(
    () =>
      demoCustomers.map((c) => ({
        customer: c,
        ...enrichCustomerRow(c),
      })),
    [],
  );

  const filteredLeads = useMemo(() => {
    const q = leadSearch.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.company.toLowerCase().includes(q) ||
        l.companyEn.toLowerCase().includes(q) ||
        l.contactName.toLowerCase().includes(q),
    );
  }, [leads, leadSearch]);

  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? leads[0];

  const updateLeadStage = useCallback((id: string, stage: CrmLeadStage) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, stage, lastTouchAt: new Date().toISOString().slice(0, 10) } : l,
      ),
    );
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
        body: JSON.stringify({
          ...payload,
          locale,
          website: "",
        }),
      });
      return (await res.json()) as {
        ok?: boolean;
        sent?: boolean;
        code?: string;
      };
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
    if (endedRows.length === 0) return;
    setSending("batch-feedback");
    let sent = 0;
    try {
      for (const { customer: c, campaign: cp } of endedRows) {
        const data = await postCrmEmail({
          kind: "feedback_request",
          to: c.email,
          company: companyLabel(c),
          contactName: c.contactName,
          campaignName: campaignName(cp),
        });
        if (data.code === "EMAIL_DISABLED" || data.code === "SMTP_DISABLED") {
          toast("warning", t("smtpSkipped"));
          setSending(null);
          return;
        }
        if (data.sent) sent += 1;
      }
      toast(
        "success",
        t("batchFeedbackResult", { sent, total: endedRows.length }),
      );
    } catch {
      toast("error", t("smtpFailed"));
    } finally {
      setSending(null);
    }
  }, [campaignName, companyLabel, endedRows, postCrmEmail, t, toast]);

  const refreshSegmentation = useCallback(() => {
    setSegmentRefreshing(true);
    window.setTimeout(() => {
      setSegmentRunAt(new Date().toISOString());
      setSegmentRefreshing(false);
      toast("success", t("segmentRefreshed"));
    }, 600);
  }, [t, toast]);

  const tabs: { id: TabId; icon: typeof Gauge }[] = [
    { id: "dashboard", icon: Gauge },
    { id: "leads", icon: Users },
    { id: "intelligence", icon: Brain },
    { id: "automation", icon: Zap },
  ];

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

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

      {tab === "dashboard" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {t("pickCustomer")}
                </label>
                <select
                  className="h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  {demoCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {companyLabel(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="rounded-lg border bg-white px-3 py-2">
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">
                    {t("totalImpressions")}
                  </p>
                  <p className="text-lg font-bold text-navy">
                    {dashboardStats.totalImp.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border bg-white px-3 py-2">
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">
                    {t("activeCampaigns")}
                  </p>
                  <p className="text-lg font-bold text-navy">{dashboardStats.active}</p>
                </div>
                <div className="rounded-lg border bg-white px-3 py-2">
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">
                    {t("avgCtrVsBench")}
                  </p>
                  <p className="text-lg font-bold text-navy">
                    {dashboardStats.avgRatio > 0
                      ? `${(dashboardStats.avgRatio * 100).toFixed(0)}%`
                      : "—"}
                  </p>
                </div>
                <div className="rounded-lg border bg-white px-3 py-2">
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">
                    {t("totalSpendAccount")}
                  </p>
                  <p className="text-lg font-bold text-navy">
                    {dashboardStats.totalSpendMillion > 0
                      ? `₩${(dashboardStats.totalSpendMillion * 100_000).toLocaleString(isKo ? "ko-KR" : "en-US")}`
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {dashboardCompareCampaigns.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("performanceCompareTitle")}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {t("performanceCompareDesc")}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboardCompareCampaigns.map((cp) => {
                  const ratio =
                    cp.ctrBenchmark > 0 ? cp.ctr / cp.ctrBenchmark : 0;
                  const barPct = Math.min(100, ratio * 50);
                  return (
                    <div key={cp.id}>
                      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-xs">
                        <span className="font-medium text-navy">
                          {campaignName(cp)}
                        </span>
                        <span className="text-muted-foreground">
                          CTR {cp.ctr}% / {cp.ctrBenchmark}% ·{" "}
                          <span
                            className={cn(
                              "font-semibold",
                              ratio >= 1 ? "text-emerald-600" : "text-amber-700",
                            )}
                          >
                            {(ratio * 100).toFixed(0)}%
                          </span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-navy to-gold"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {customer.campaigns.map((cp) => (
              <Card key={cp.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">
                      {campaignName(cp)}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={cn("shrink-0", campaignStatusClass(cp.status))}
                    >
                      {cp.status === "active" && t("statusActive")}
                      {cp.status === "ended" && t("statusEnded")}
                      {cp.status === "scheduled" && t("statusScheduled")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {cp.startDate} — {cp.endDate}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cp.status === "scheduled" ? (
                    <p className="text-sm text-muted-foreground">
                      {t("impressions")}: — · {t("reach")}: —
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground">
                            {t("impressions")}
                          </p>
                          <p className="font-semibold text-navy">
                            {cp.impressions.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground">
                            {t("reach")}
                          </p>
                          <p className="font-semibold text-navy">
                            {cp.reach.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground">
                            {t("ctr")}
                          </p>
                          <p className="font-semibold text-navy">{cp.ctr}%</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground">
                            {t("vsGoal")}
                          </p>
                          <p
                            className={cn(
                              "font-semibold",
                              cp.ctr >= cp.ctrBenchmark
                                ? "text-emerald-600"
                                : "text-amber-700",
                            )}
                          >
                            {((cp.ctr / cp.ctrBenchmark) * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                          <span>CTR / benchmark</span>
                          <span>
                            {cp.ctr}% / {cp.ctrBenchmark}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-navy to-gold"
                            style={{
                              width: `${Math.min(100, (cp.ctr / cp.ctrBenchmark) * 50)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("spend")}:{" "}
                        <span className="font-medium text-navy">
                          {cp.spendMillion > 0
                            ? `₩${(cp.spendMillion * 100_000).toLocaleString()}`
                            : "—"}
                        </span>
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

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
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-3 pr-3">{t("company")}</th>
                  <th className="pb-3 pr-3">{t("contact")}</th>
                  <th className="pb-3 pr-3 hidden md:table-cell">{t("email")}</th>
                  <th className="pb-3 pr-3">{t("leadSource")}</th>
                  <th className="pb-3 pr-3">{t("leadValue")}</th>
                  <th className="pb-3 pr-3">{t("lastTouch")}</th>
                  <th className="pb-3">{t("leadStage")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-3 pr-3 font-medium text-navy">
                      {isKo ? l.company : l.companyEn}
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">{l.contactName}</td>
                    <td className="py-3 pr-3 text-muted-foreground hidden md:table-cell">
                      {l.email}
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">
                      {isKo ? l.source : l.sourceEn}
                    </td>
                    <td className="py-3 pr-3">{l.valueMillion.toLocaleString()}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{l.lastTouchAt}</td>
                    <td className="py-3">
                      <select
                        className="h-9 max-w-[140px] rounded-md border border-input bg-background px-2 text-xs"
                        value={l.stage}
                        onChange={(e) =>
                          updateLeadStage(l.id, e.target.value as CrmLeadStage)
                        }
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
          </CardContent>
        </Card>
      )}

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
              {segmentRunAt ? (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {t("segmentLastRun", {
                    time: new Date(segmentRunAt).toLocaleString(isKo ? "ko-KR" : "en-US"),
                  })}
                </p>
              ) : null}
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
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-3 pr-3">{t("company")}</th>
                    <th className="pb-3 pr-3">{t("segmentColumn")}</th>
                    <th className="pb-3 pr-3 min-w-[220px]">{t("rationaleColumn")}</th>
                    <th className="pb-3 pr-3">{t("repurchase")}</th>
                    <th className="pb-3">{t("repurchaseScore")}</th>
                  </tr>
                </thead>
                <tbody>
                  {intelligenceRows.map(
                    ({ customer: c, segment, repurchase, rationaleKeys }) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="py-3 pr-3 font-medium text-navy align-top">
                          {companyLabel(c)}
                        </td>
                        <td className="py-3 pr-3 align-top">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-semibold",
                              segmentBadgeClass(segment),
                            )}
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
                        <td className="py-3 pr-3 text-muted-foreground align-top">
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
                            <span className="font-semibold text-navy">
                              {repurchase.score}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

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
                  >
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {isKo ? l.company : l.companyEn} — {l.contactName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pointer-events-none absolute left-0 top-0 h-px w-px overflow-hidden opacity-0" aria-hidden>
                  <label htmlFor="crm-hp-auto">Company website</label>
                  <input id="crm-hp-auto" tabIndex={-1} autoComplete="off" name="website" />
                </div>
                <Button
                  type="button"
                  className="w-full bg-navy hover:bg-navy/90"
                  disabled={
                    !selectedLead || sending === "auto" || sending === "batch-feedback"
                  }
                  onClick={() => {
                    if (!selectedLead) return;
                    void sendCrmEmail("auto", {
                      kind: "auto_reply",
                      to: selectedLead.email,
                      company: isKo ? selectedLead.company : selectedLead.companyEn,
                      contactName: selectedLead.contactName,
                    });
                  }}
                >
                  {sending === "auto" ? t("sending") : t("sendAutoReply")}
                </Button>
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
                    {t("scheduledBadge")}: {endedRows.length}{" "}
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
              {endedRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noEnded")}</p>
              ) : (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      {t("batchFeedbackHint", { count: endedRows.length })}
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
                  {autoSchedule ? (
                    <p className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-navy/90">
                      {t("autoFeedbackQueueNote", { count: endedRows.length })}
                    </p>
                  ) : null}
                  <ul className="space-y-2">
                    {endedRows.map(({ customer: c, campaign: cp }) => (
                      <li
                        key={`${c.id}-${cp.id}`}
                        className="flex flex-col gap-2 rounded-lg border bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-navy">
                            {companyLabel(c)} · {campaignName(cp)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {cp.endDate}
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
                            sending === `${c.id}-${cp.id}` ||
                            sending === "batch-feedback"
                          }
                          onClick={() =>
                            void sendCrmEmail(`${c.id}-${cp.id}`, {
                              kind: "feedback_request",
                              to: c.email,
                              company: companyLabel(c),
                              contactName: c.contactName,
                              campaignName: campaignName(cp),
                            })
                          }
                        >
                          {sending === `${c.id}-${cp.id}`
                            ? t("sending")
                            : t("sendFeedback")}
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
