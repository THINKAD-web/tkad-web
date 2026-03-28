"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
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
  Bell,
  FileSignature,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Megaphone,
  PanelLeft,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  PARTNER_SESSION_EMAIL_KEY,
  DEMO_PARTNER_OTP,
  contractStatusStyles,
  findPartnerByEmail,
  getDefaultDemoPartner,
  mediaStatusStyles,
  settlementStatusStyles,
  type PartnerAccount,
  type PartnerMedia,
} from "@/lib/partner-portal-mock";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";

type AuthStep = "credentials" | "totp" | "portal";
type TabId = "contracts" | "media" | "settlements" | "campaigns" | "notices";

function formatMan(n: number, isKo: boolean) {
  return n.toLocaleString(isKo ? "ko-KR" : "en-US");
}

export default function PartnerPortalPage() {
  const t = useTranslations("partner");
  const locale = useLocale();
  const isKo = locale === "ko";
  const { toast } = useToast();

  const [step, setStep] = useState<AuthStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partner, setPartner] = useState<PartnerAccount | null>(null);
  const [pendingPartner, setPendingPartner] = useState<PartnerAccount | null>(
    null,
  );
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<TabId>("contracts");
  const [localMedia, setLocalMedia] = useState<PartnerMedia[]>([]);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [editingMedia, setEditingMedia] = useState<PartnerMedia | null>(null);
  const [mediaForm, setMediaForm] = useState({
    name: "",
    type: "",
    location: "",
    panelCount: "1",
  });
  const [expandedNotice, setExpandedNotice] = useState<string | null>(null);

  useEffect(() => {
    startTransition(() => {
      try {
        const raw = localStorage.getItem(PARTNER_SESSION_EMAIL_KEY);
        if (raw) {
          const p = findPartnerByEmail(raw) ?? getDefaultDemoPartner();
          setPartner(p);
          setLocalMedia([...p.media]);
          setStep("portal");
        }
      } catch {
        /* ignore */
      }
      setHydrated(true);
    });
  }, []);

  const persistSession = useCallback((p: PartnerAccount) => {
    try {
      localStorage.setItem(PARTNER_SESSION_EMAIL_KEY, p.email);
    } catch {
      /* ignore */
    }
  }, []);

  const logout = useCallback(() => {
    setPartner(null);
    setPendingPartner(null);
    setStep("credentials");
    setEmail("");
    setPassword("");
    setTotp("");
    setError(null);
    setLocalMedia([]);
    setTab("contracts");
    try {
      localStorage.removeItem(PARTNER_SESSION_EMAIL_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const submitCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !email.includes("@")) {
      setError(t("errorEmail"));
      return;
    }
    if (password.length < 6) {
      setError(t("errorPassword"));
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const p =
        findPartnerByEmail(email.trim()) ?? getDefaultDemoPartner();
      setPendingPartner(p);
      setLoading(false);
      setStep("totp");
      setTotp("");
    }, 500);
  };

  const submitTotp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(totp.trim())) {
      setError(t("errorTotp"));
      return;
    }
    if (totp.trim() !== DEMO_PARTNER_OTP) {
      setError(t("errorTotpWrong"));
      return;
    }
    const p = pendingPartner ?? getDefaultDemoPartner();
    setPartner(p);
    setLocalMedia([...p.media]);
    persistSession(p);
    setPendingPartner(null);
    setStep("portal");
    setTotp("");
  };

  const openAddMedia = () => {
    setEditingMedia(null);
    setMediaForm({ name: "", type: "", location: "", panelCount: "1" });
    setMediaModalOpen(true);
  };

  const openEditMedia = (m: PartnerMedia) => {
    setEditingMedia(m);
    setMediaForm({
      name: isKo ? m.nameKo : m.nameEn,
      type: isKo ? m.typeKo : m.typeEn,
      location: isKo ? m.locationKo : m.locationEn,
      panelCount: String(m.panelCount),
    });
    setMediaModalOpen(true);
  };

  const saveMedia = () => {
    if (!mediaForm.name.trim() || !mediaForm.type.trim()) {
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const panels = Math.max(1, parseInt(mediaForm.panelCount, 10) || 1);
    if (editingMedia) {
      setLocalMedia((list) =>
        list.map((x) =>
          x.id === editingMedia.id
            ? {
                ...x,
                nameKo: mediaForm.name,
                nameEn: mediaForm.name,
                typeKo: mediaForm.type,
                typeEn: mediaForm.type,
                locationKo: mediaForm.location,
                locationEn: mediaForm.location,
                panelCount: panels,
                lastUpdated: today,
              }
            : x,
        ),
      );
      toast("success", t("mediaUpdated"));
    } else {
      const id = `M-NEW-${Date.now()}`;
      const row: PartnerMedia = {
        id,
        nameKo: mediaForm.name,
        nameEn: mediaForm.name,
        typeKo: mediaForm.type,
        typeEn: mediaForm.type,
        locationKo: mediaForm.location || (isKo ? "미입력" : "TBD"),
        locationEn: mediaForm.location || (isKo ? "미입력" : "TBD"),
        status: "review",
        lastUpdated: today,
        panelCount: panels,
      };
      setLocalMedia((list) => [...list, row]);
      toast("success", t("mediaAdded"));
    }
    setMediaModalOpen(false);
    setEditingMedia(null);
  };

  const sortedNotices = useMemo(() => {
    if (!partner) return [];
    return [...partner.notices].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.date.localeCompare(a.date);
    });
  }, [partner]);

  const portalStats = useMemo(() => {
    if (!partner) return null;
    const contractsTotal = partner.contracts.length;
    const contractsActive = partner.contracts.filter((c) => c.status === "active")
      .length;
    const contractsRenewal = partner.contracts.filter(
      (c) => c.status === "pending_renewal",
    ).length;
    const mediaTotal = localMedia.length;
    const mediaLive = localMedia.filter((m) => m.status === "live").length;
    const mediaReview = localMedia.filter((m) => m.status === "review").length;
    const settlementOutstandingMan = partner.settlements
      .filter((s) => s.status !== "paid")
      .reduce((a, s) => a + s.amountMan, 0);
    const settlementPaidRows = partner.settlements.filter(
      (s) => s.status === "paid",
    ).length;
    return {
      contractsTotal,
      contractsActive,
      contractsRenewal,
      mediaTotal,
      mediaLive,
      mediaReview,
      settlementOutstandingMan,
      settlementPaidRows,
      settlementRows: partner.settlements.length,
    };
  }, [partner, localMedia]);

  const tabs: { id: TabId; label: string; icon: typeof FileSignature }[] = [
    { id: "contracts", label: t("tabContracts"), icon: FileSignature },
    { id: "media", label: t("tabMedia"), icon: PanelLeft },
    { id: "settlements", label: t("tabSettlements"), icon: Wallet },
    { id: "campaigns", label: t("tabCampaigns"), icon: Megaphone },
    { id: "notices", label: t("tabNotices"), icon: Bell },
  ];

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-gold" />
      </div>
    );
  }

  if (step !== "portal" || !partner) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white py-12">
        <div className="mx-auto max-w-md px-4">
          <Card className="border-navy/10 shadow-lg">
            <CardHeader>
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge className="border-0 bg-navy/90 text-white">{t("loginBadge")}</Badge>
                <Badge variant="outline" className="border-navy/20 text-navy">
                  {t("loginPartnerOnly")}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-navy">
                <ShieldCheck className="h-6 w-6 text-gold" />
                <CardTitle>{t("loginTitle")}</CardTitle>
              </div>
              <CardDescription>{t("loginSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              {step === "credentials" && (
                <ul className="mb-5 space-y-1.5 rounded-xl border border-navy/10 bg-slate-50/90 px-3 py-3 text-xs text-navy/75">
                  <li className="flex gap-2">
                    <FileSignature className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                    {t("loginFeatureContracts")}
                  </li>
                  <li className="flex gap-2">
                    <PanelLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                    {t("loginFeatureMedia")}
                  </li>
                  <li className="flex gap-2">
                    <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                    {t("loginFeatureSettlement")}
                  </li>
                </ul>
              )}
              {step === "credentials" && (
                <form className="space-y-4" onSubmit={submitCredentials}>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-navy/70">
                      {t("email")}
                    </label>
                    <Input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="partner@example.com"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-navy/70">
                      {t("password")}
                    </label>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t("passwordHint")}
                    </p>
                  </div>
                  {error ? (
                    <p className="text-xs font-medium text-red-600">{error}</p>
                  ) : null}
                  <Button
                    type="submit"
                    className="w-full bg-navy text-white hover:bg-navy/90"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="mr-2 h-4 w-4" />
                    )}
                    {t("signIn")}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    {isKo
                      ? "데모: partner1@example.com / partner2@example.com — 비밀번호 6자 이상"
                      : "Demo: partner1@example.com or partner2@example.com — password 6+ chars."}
                  </p>
                </form>
              )}

              {step === "totp" && (
                <form className="space-y-4" onSubmit={submitTotp}>
                  <div>
                    <p className="text-sm font-medium text-navy">{t("totpTitle")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("totpSubtitle")}
                    </p>
                  </div>
                  <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={totp}
                    onChange={(e) =>
                      setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder={t("totpPlaceholder")}
                    className="text-center font-mono text-lg tracking-[0.3em]"
                  />
                  <p className="text-xs font-medium text-gold-dark">
                    {t("totpDemoHint")}
                  </p>
                  {error ? (
                    <p className="text-xs font-medium text-red-600">{error}</p>
                  ) : null}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setStep("credentials");
                        setError(null);
                        setTotp("");
                      }}
                    >
                      {t("back")}
                    </Button>
                    <Button type="submit" className="flex-1 bg-gold font-bold text-navy">
                      <Lock className="mr-2 h-4 w-4" />
                      {t("totpVerify")}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link href="/" className="text-navy underline-offset-4 hover:underline">
              {isKo ? "홈으로" : "Back to home"}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20">
      <header className="border-b border-navy/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-lg font-extrabold text-navy sm:text-xl">
              {t("portalTitle")}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t("welcome", {
                company: isKo ? partner.companyKo : partner.companyEn,
                name: isKo ? partner.contactNameKo : partner.contactNameEn,
              })}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="mr-1.5 h-4 w-4" />
            {t("logout")}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {portalStats ? (
          <section className="mb-8 space-y-3" aria-label={t("overviewTitle")}>
            <h2 className="flex items-center gap-2 text-base font-extrabold text-navy sm:text-lg">
              <LayoutDashboard className="h-5 w-5 text-gold" />
              {t("overviewTitle")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card
                role="button"
                tabIndex={0}
                className="cursor-pointer gap-0 py-5 ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                onClick={() => setTab("contracts")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setTab("contracts");
                  }
                }}
              >
                <CardHeader className="pb-2 pt-0">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-semibold text-navy/80">
                      {t("tabContracts")}
                    </CardTitle>
                    <FileSignature className="h-4 w-4 text-gold" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 pb-0 pt-0">
                  <p className="text-2xl font-extrabold text-navy">
                    {portalStats.contractsActive}
                    <span className="text-lg font-semibold text-navy/40">
                      {" "}
                      / {portalStats.contractsTotal}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("overviewContractsCaption")}
                  </p>
                  {portalStats.contractsRenewal > 0 ? (
                    <p className="text-xs font-medium text-amber-800">
                      {t("overviewRenewal", { n: portalStats.contractsRenewal })}
                    </p>
                  ) : null}
                  <p className="pt-2 text-xs font-bold text-gold-dark">
                    {t("overviewOpen")} →
                  </p>
                </CardContent>
              </Card>

              <Card
                role="button"
                tabIndex={0}
                className="cursor-pointer gap-0 py-5 ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                onClick={() => setTab("media")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setTab("media");
                  }
                }}
              >
                <CardHeader className="pb-2 pt-0">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-semibold text-navy/80">
                      {t("tabMedia")}
                    </CardTitle>
                    <PanelLeft className="h-4 w-4 text-gold" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 pb-0 pt-0">
                  <p className="text-2xl font-extrabold text-navy">
                    {portalStats.mediaTotal}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("overviewMediaCaption")}: {portalStats.mediaLive} ·{" "}
                    {portalStats.mediaReview}
                  </p>
                  <p className="pt-2 text-xs font-bold text-gold-dark">
                    {t("overviewOpen")} →
                  </p>
                </CardContent>
              </Card>

              <Card
                role="button"
                tabIndex={0}
                className="cursor-pointer gap-0 py-5 ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                onClick={() => setTab("settlements")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setTab("settlements");
                  }
                }}
              >
                <CardHeader className="pb-2 pt-0">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-semibold text-navy/80">
                      {t("tabSettlements")}
                    </CardTitle>
                    <Wallet className="h-4 w-4 text-gold" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 pb-0 pt-0">
                  <p className="text-2xl font-extrabold text-navy tabular-nums">
                    {formatMan(portalStats.settlementOutstandingMan, isKo)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("overviewSettlementCaption")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("settlementPaidSummary", {
                      paid: portalStats.settlementPaidRows,
                      total: portalStats.settlementRows,
                    })}
                  </p>
                  <p className="pt-2 text-xs font-bold text-gold-dark">
                    {t("overviewOpen")} →
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
        ) : null}

        <div className="mb-6 flex flex-wrap gap-2 border-b border-navy/10 pb-4">
          {tabs.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={tab === id ? "default" : "ghost"}
              onClick={() => setTab(id)}
              className={cn(
                tab === id ? "bg-navy text-white" : "text-navy/70",
              )}
            >
              <Icon className="mr-1.5 h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>

        {tab === "contracts" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-navy">{t("contractsTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("contractsSubtitle")}</p>
            </div>
            {partner.contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("contractsEmpty")}</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {partner.contracts.map((c) => {
                  const st = contractStatusStyles[c.status];
                  return (
                    <Card key={c.id} className="border-navy/10 shadow-sm">
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {c.id}
                          </p>
                          <Badge className={cn("border-0", st.className)}>
                            {isKo ? st.labelKo : st.labelEn}
                          </Badge>
                        </div>
                        <CardTitle className="text-base text-navy">
                          {isKo ? c.titleKo : c.titleEn}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <p className="text-muted-foreground">
                          {isKo ? c.summaryKo : c.summaryEn}
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs">
                          <span>
                            <span className="text-muted-foreground">
                              {t("period")}:{" "}
                            </span>
                            <span className="font-medium text-navy">
                              {c.startDate} — {c.endDate}
                            </span>
                          </span>
                          <span>
                            <span className="text-muted-foreground">
                              {t("contractValue")}:{" "}
                            </span>
                            <span className="font-semibold text-navy">
                              {formatMan(c.valueMan, isKo)}
                            </span>
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === "media" && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-navy">{t("mediaTitle")}</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  {t("mediaSubtitle")}
                </p>
              </div>
              <Button
                type="button"
                className="bg-gold font-bold text-navy hover:bg-gold-dark"
                onClick={openAddMedia}
              >
                <PanelLeft className="mr-2 h-4 w-4" />
                {t("mediaAdd")}
              </Button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-navy/10">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-navy/10 bg-slate-50 text-xs font-semibold text-navy/70">
                  <tr>
                    <th className="px-3 py-2">{t("mediaName")}</th>
                    <th className="px-3 py-2">{t("mediaType")}</th>
                    <th className="px-3 py-2">{t("mediaLocation")}</th>
                    <th className="px-3 py-2">{t("mediaPanels")}</th>
                    <th className="px-3 py-2">{t("mediaStatus")}</th>
                    <th className="px-3 py-2">{t("mediaLastUpdated")}</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {localMedia.map((m) => {
                    const st = mediaStatusStyles[m.status];
                    return (
                      <tr key={m.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-medium text-navy">
                          {isKo ? m.nameKo : m.nameEn}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {isKo ? m.typeKo : m.typeEn}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {isKo ? m.locationKo : m.locationEn}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{m.panelCount}</td>
                        <td className="px-3 py-2">
                          <Badge className={cn("border-0 text-[10px]", st.className)}>
                            {isKo ? st.labelKo : st.labelEn}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-xs">{m.lastUpdated}</td>
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => openEditMedia(m)}
                          >
                            {t("mediaEdit")}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "settlements" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-navy">{t("settlementsTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("settlementsSubtitle")}
              </p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-navy/10">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-navy/10 bg-slate-50 text-xs font-semibold text-navy/70">
                  <tr>
                    <th className="px-3 py-2">{t("settlementPeriod")}</th>
                    <th className="px-3 py-2">{t("settlementAmount")}</th>
                    <th className="px-3 py-2">{t("settlementStatus")}</th>
                    <th className="px-3 py-2">{t("settlementPaid")}</th>
                    <th className="px-3 py-2">{t("settlementScheduled")}</th>
                    <th className="px-3 py-2">{t("settlementNote")}</th>
                  </tr>
                </thead>
                <tbody>
                  {partner.settlements.map((s) => {
                    const st = settlementStatusStyles[s.status];
                    return (
                      <tr key={s.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-medium text-navy">
                          {isKo ? s.periodLabelKo : s.periodLabelEn}
                        </td>
                        <td className="px-3 py-2 tabular-nums font-semibold">
                          {formatMan(s.amountMan, isKo)}
                        </td>
                        <td className="px-3 py-2">
                          <Badge className={cn("border-0 text-[10px]", st.className)}>
                            {isKo ? st.labelKo : st.labelEn}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-xs">{s.paidDate ?? "—"}</td>
                        <td className="px-3 py-2 text-xs">
                          {s.scheduledDate ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {isKo ? s.noteKo : s.noteEn}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "campaigns" && (
          <section className="space-y-4">
            <h2 className="text-base font-bold text-navy">{t("campaignsTitle")}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {partner.sharedCampaigns.map((c) => (
                <Card key={c.id} className="border-navy/10 shadow-sm">
                  <CardHeader className="pb-2">
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {c.id}
                    </p>
                    <CardTitle className="text-base text-navy">
                      {isKo ? c.titleKo : c.titleEn}
                    </CardTitle>
                    <CardDescription>
                      {t("campaignBrand")}:{" "}
                      {isKo ? c.brandKo : c.brandEn}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {t("campaignProgress")}
                        </span>
                        <span className="font-bold text-navy">
                          {c.progressPercent}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gold transition-all"
                          style={{ width: `${c.progressPercent}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-navy/80">
                      {isKo ? c.statusKo : c.statusEn}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("campaignWindow")}: {c.startDate} — {c.endDate}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {tab === "notices" && (
          <section className="space-y-4">
            <h2 className="text-base font-bold text-navy">{t("noticesTitle")}</h2>
            <ul className="space-y-3">
              {sortedNotices.map((n) => {
                const open = expandedNotice === n.id;
                return (
                  <li key={n.id}>
                    <Card className="border-navy/10 shadow-sm">
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {n.pinned ? (
                            <Badge className="bg-gold/20 text-navy">
                              {t("noticePinned")}
                            </Badge>
                          ) : null}
                          <span className="text-xs text-muted-foreground">
                            {n.date}
                          </span>
                        </div>
                        <CardTitle className="text-base text-navy">
                          {isKo ? n.titleKo : n.titleEn}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p
                          className={cn(
                            "text-sm text-muted-foreground",
                            !open && "line-clamp-2",
                          )}
                        >
                          {isKo ? n.bodyKo : n.bodyEn}
                        </p>
                        <Button
                          type="button"
                          variant="link"
                          className="mt-2 h-auto p-0 text-xs text-gold-dark"
                          onClick={() =>
                            setExpandedNotice((cur) => (cur === n.id ? null : n.id))
                          }
                        >
                          {open ? t("noticeCollapse") : t("noticeExpand")}
                        </Button>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      <Modal
        open={mediaModalOpen}
        onClose={() => {
          setMediaModalOpen(false);
          setEditingMedia(null);
        }}
        className="max-w-md"
        ariaLabel={editingMedia ? t("mediaModalEditTitle") : t("mediaModalAddTitle")}
      >
        <div className="p-6 pt-10">
          <h3 className="text-lg font-bold text-navy">
            {editingMedia ? t("mediaModalEditTitle") : t("mediaModalAddTitle")}
          </h3>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-navy/70">
                {t("mediaName")}
              </label>
              <Input
                className="mt-1"
                value={mediaForm.name}
                onChange={(e) =>
                  setMediaForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-navy/70">
                {t("mediaType")}
              </label>
              <Input
                className="mt-1"
                value={mediaForm.type}
                onChange={(e) =>
                  setMediaForm((f) => ({ ...f, type: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-navy/70">
                {t("mediaLocation")}
              </label>
              <Textarea
                className="mt-1 min-h-[72px]"
                value={mediaForm.location}
                onChange={(e) =>
                  setMediaForm((f) => ({ ...f, location: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-navy/70">
                {t("mediaPanels")}
              </label>
              <Input
                className="mt-1"
                inputMode="numeric"
                value={mediaForm.panelCount}
                onChange={(e) =>
                  setMediaForm((f) => ({
                    ...f,
                    panelCount: e.target.value.replace(/\D/g, "").slice(0, 3),
                  }))
                }
              />
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setMediaModalOpen(false);
                setEditingMedia(null);
              }}
            >
              {t("mediaCancel")}
            </Button>
            <Button
              type="button"
              className="flex-1 bg-navy text-white"
              onClick={saveMedia}
            >
              {t("mediaSave")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
