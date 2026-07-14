"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { BtnBlock } from "@/components/brutalist";
import Modal from "@/components/ui/modal";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { PageHero } from "@/components/layout/page-hero";
import { SubTabs } from "@/components/layout/sub-tabs";
import { CONTENT_TABS } from "@/lib/navigation/sub-page-tabs";
import {
  Calendar,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Loader2,
  MessageCircle,
  MonitorPlay,
  Presentation,
  Users,
  Video,
} from "lucide-react";
import {
  DEMO_VIDEO_EMBED,
  academyDownloads,
  academyWebinars,
  type AcademyLesson,
  type AcademyDownload,
} from "@/lib/academy-content";
import {
  downloadAcademyAssetPdf,
  downloadAcademyOutlinePdf,
} from "@/lib/build-academy-pdf";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";
import { ContentNotifySignup } from "@/components/content-notify-signup";

const inputCls =
  "h-10 w-full border-2 border-border bg-card px-3  text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";
const labelCls =
  "block font-display text-xs font-medium uppercase tracking-[0.22em] text-primary";

const ACADEMY_CAT_PATTERNS: Record<string, RegExp> = {
  "ooh-basics": /ooh|101|기초|입문/i,
  measurement: /측정|cpm|ots|데이터|검증/i,
  creative: /크리에이티브|소재|제작/i,
  planning: /전략|플래|믹스|캠페인/i,
  programmatic: /팬덤|프로그래매틱|dooh/i,
};

export default function AcademyPageClient({
  dbLessons,
  downloadPdfUrls = {},
}: {
  dbLessons: AcademyLesson[];
  downloadPdfUrls?: Record<string, string>;
}) {
  const t = useTranslations("academy");
  const locale = useLocale();
  const isKo = locale === "ko";
  const searchParams = useSearchParams();
  const activeCat = searchParams.get("cat");
  const basicsRef = useRef<HTMLElement | null>(null);
  const { toast } = useToast();
  const registerRef = useRef<HTMLElement | null>(null);

  const [videoOpen, setVideoOpen] = useState(false);
  const [videoEmbed, setVideoEmbed] = useState(DEMO_VIDEO_EMBED);
  const [videoTitle, setVideoTitle] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [pdfModalAsset, setPdfModalAsset] = useState<AcademyDownload | null>(
    null,
  );
  const [pdfEmail, setPdfEmail] = useState("");

  const [regWebinar, setRegWebinar] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regCompany, setRegCompany] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);

  const openLessonVideo = (lesson: AcademyLesson) => {
    setVideoEmbed(lesson.videoEmbedUrl);
    setVideoTitle(isKo ? lesson.titleKo : lesson.titleEn);
    setVideoOpen(true);
  };

  const closeVideo = useCallback(() => setVideoOpen(false), []);

  const filteredLessons = useMemo(() => {
    if (!activeCat) return dbLessons;
    const pattern = ACADEMY_CAT_PATTERNS[activeCat];
    if (!pattern) return dbLessons;
    return dbLessons.filter((lesson) => {
      const hay = `${lesson.titleKo} ${lesson.titleEn} ${lesson.descKo} ${lesson.descEn}`;
      return pattern.test(hay);
    });
  }, [activeCat, dbLessons]);

  useEffect(() => {
    if (!activeCat) return;
    basicsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeCat]);

  const handleOutline = async (lesson: AcademyLesson) => {
    setDownloading(`outline-${lesson.id}`);
    try {
      await downloadAcademyOutlinePdf(lesson, isKo);
      toast("success", t("toastOutline"));
    } catch {
      toast("error", t("toastPdfError"));
    } finally {
      setDownloading(null);
    }
  };

  const handleAssetPdf = (asset: AcademyDownload) => {
    setPdfModalAsset(asset);
    setPdfEmail("");
  };

  const submitPdfDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    const asset = pdfModalAsset;
    if (!asset) return;
    const email = pdfEmail.trim();
    if (!email.includes("@")) {
      toast("warning", t("registerEmailInvalid"));
      return;
    }
    setDownloading(`asset-${asset.id}`);
    try {
      const res = await fetch("/api/academy/download-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: asset.id,
          email,
          locale,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        pdfUrl?: string | null;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "download failed");
      }
      if (data.pdfUrl) {
        window.open(data.pdfUrl, "_blank", "noopener,noreferrer");
        toast("success", t("toastAsset"));
        setPdfModalAsset(null);
      } else {
        await downloadAcademyAssetPdf(asset, isKo);
        toast("success", t("toastAsset"));
        setPdfModalAsset(null);
      }
    } catch {
      toast("error", t("toastPdfError"));
    } finally {
      setDownloading(null);
    }
  };

  const handlePpt = () => {
    toast("success", t("pptToast"));
  };

  const scrollToRegister = (webinarId: string) => {
    setRegWebinar(webinarId);
    registerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail.trim() || !regEmail.includes("@")) {
      toast("warning", t("registerEmailInvalid"));
      return;
    }
    if (!regWebinar) {
      toast("warning", t("registerSelectRequired"));
      return;
    }
    setRegSubmitting(true);
    try {
      const res = await fetch("/api/academy/webinar-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webinarId: regWebinar,
          email: regEmail.trim(),
          name: regName.trim() || undefined,
          company: regCompany.trim() || undefined,
          locale,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "register failed");
      }
      toast("success", t("registerSuccess"));
      setRegName("");
      setRegEmail("");
      setRegCompany("");
    } catch {
      toast("error", t("registerError"));
    } finally {
      setRegSubmitting(false);
    }
  };

  const formatWebinarWhen = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isKo) {
        const y = new Intl.DateTimeFormat("ko-KR", {
          timeZone: "Asia/Seoul",
          year: "numeric",
        }).format(d);
        const m = new Intl.DateTimeFormat("ko-KR", {
          timeZone: "Asia/Seoul",
          month: "2-digit",
        }).format(d);
        const day = new Intl.DateTimeFormat("ko-KR", {
          timeZone: "Asia/Seoul",
          day: "2-digit",
        }).format(d);
        const hour = Number(
          new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Seoul",
            hour: "numeric",
            hour12: false,
          }).format(d),
        );
        const minute = new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Seoul",
          minute: "2-digit",
        }).format(d);
        const isPm = hour >= 12;
        const h12 = hour % 12 === 0 ? 12 : hour % 12;
        const mm = minute.padStart(2, "0");
        return `${y}.${m}.${day} ${isPm ? "오후" : "오전"} ${h12}:${mm}`;
      }
      return (
        new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Seoul",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }).format(d) + " KST"
      );
    } catch {
      return iso;
    }
  };

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon pb-4 sm:pb-6">
        <PageHero
          eyebrow="// 03 · CONTENT"
          title="OOH 광고를 "
          highlight="제대로 배우다"
          description="광고 초보자도 쉽게 이해하는 OOH 교육 콘텐츠"
        />
        <SubTabs tabs={CONTENT_TABS} currentPath="/academy" />

        <section className="bg-card py-8 text-foreground">
          <div className="mx-auto grid max-w-7xl gap-0 px-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-6 lg:px-8">
            {[
              {
                href: "#academy-basics",
                icon: Video,
                t: "valueStripBasics",
                d: "valueStripBasicsDesc",
              },
              {
                href: "#academy-webinars",
                icon: Calendar,
                t: "valueStripWebinars",
                d: "valueStripWebinarsDesc",
              },
              {
                href: "#academy-downloads",
                icon: Download,
                t: "valueStripDownloads",
                d: "valueStripDownloadsDesc",
              },
              {
                href: "#academy-consult",
                icon: MessageCircle,
                t: "valueStripConsult",
                d: "valueStripConsultDesc",
              },
            ].map(({ href, icon: Icon, t: titleKey, d: descKey }) => (
              <a
                key={href}
                href={href}
                className="group -ml-[2px] flex gap-3 border-2 border-border bg-muted p-4 transition-colors hover:bg-foreground hover:text-background"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border bg-primary text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-bold tracking-normal text-foreground">
                    {t(titleKey as "valueStripBasics")}
                  </p>
                  <p className="mt-1 text-[11px] tracking-normal opacity-75">
                    {`// `}
                    {t(descKey as "valueStripBasicsDesc")}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-16 bg-muted px-4 pb-16 pt-14 text-foreground sm:px-6 sm:pb-20 lg:px-8">
          <section id="academy-basics" ref={basicsRef} className="scroll-mt-24">
            <div className="mb-8 text-center">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                [ BASICS ]
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-foreground sm:text-3xl">
                {t("sectionBasics")}
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-[12px] tracking-normal text-muted-foreground">
                {`// `}
                {t("sectionBasicsDesc")}
              </p>
            </div>
            {filteredLessons.length === 0 ? (
              <div className="border-2 border-border bg-card py-12 text-center">
                <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                  [ PREPARING ]
                </p>
                <p className="mt-3 text-base font-bold text-foreground">
                  {t("preparingLessons")}
                </p>
                <p className="mx-auto mt-2 max-w-md text-[12px] tracking-normal text-muted-foreground">
                  {t("preparingLessonsDesc")}
                </p>
                <div className="mx-auto mt-8 max-w-lg text-left">
                  <ContentNotifySignup source="academy" />
                </div>
              </div>
            ) : (
              <div className="grid gap-0 lg:grid-cols-3">
                {filteredLessons.map((lesson) => (
                  <article
                    key={lesson.id}
                    className="-mt-[2px] -ml-[2px] flex flex-col border-2 border-border bg-card"
                  >
                    <header className="border-b-2 border-border p-5">
                      <span className="inline-flex w-fit border-2 border-primary bg-primary px-2 py-0.5 font-display text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground">
                        [ {t("minutes", { n: lesson.durationMin })} ]
                      </span>
                      <h3 className="mt-3 text-lg font-bold tracking-normal text-foreground">
                        {isKo ? lesson.titleKo : lesson.titleEn}
                      </h3>
                      <p className="mt-2 text-[12px] leading-relaxed tracking-normal text-muted-foreground">
                        {`// `}
                        {isKo ? lesson.descKo : lesson.descEn}
                      </p>
                    </header>
                    <div className="mt-auto flex flex-col gap-2 p-5">
                      <BtnBlock
                        variant="secondary"
                        size="md"
                        onClick={() => openLessonVideo(lesson)}
                        className="w-full"
                      >
                        <Video className="h-4 w-4" />
                        {t("watchVideo")}
                      </BtnBlock>
                      <BtnBlock
                        variant="accent"
                        size="md"
                        onClick={() => handleOutline(lesson)}
                        disabled={downloading === `outline-${lesson.id}`}
                        className="w-full"
                      >
                        {downloading === `outline-${lesson.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        {t("downloadOutline")}
                      </BtnBlock>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section id="academy-webinars" className="scroll-mt-24">
            <div className="mb-8 text-center">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                [ WEBINARS ]
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-foreground sm:text-3xl">
                {t("sectionWebinars")}
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-[12px] tracking-normal text-muted-foreground">
                {`// `}
                {t("sectionWebinarsDesc")}
              </p>
            </div>
            <div className="grid gap-0 md:grid-cols-2">
              {academyWebinars.map((w) => (
                <article
                  key={w.id}
                  className="-mt-[2px] -ml-[2px] border-2 border-border bg-card"
                >
                  <header className="border-b-2 border-border p-5">
                    <span className="inline-flex w-fit border-2 border-primary bg-primary px-2 py-0.5 font-display text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground">
                      [ {t("badgeLive")} ]
                    </span>
                    <h3 className="mt-3 text-lg font-bold tracking-normal text-foreground">
                      {isKo ? w.titleKo : w.titleEn}
                    </h3>
                    <p className="mt-2 text-[12px] leading-relaxed tracking-normal text-muted-foreground">
                      {`// `}
                      {isKo ? w.descKo : w.descEn}
                    </p>
                  </header>
                  <div className="space-y-3 p-5 text-sm">
                    <div className="flex flex-wrap gap-x-4 gap-y-2 font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-bold text-foreground">
                          {t("webinarWhen")}:{" "}
                        </span>
                        {formatWebinarWhen(w.datetimeIso)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-bold text-foreground">
                          {t("webinarSeats")}:{" "}
                        </span>
                        {t("seatsCount", { n: w.seatsLeft })}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="font-bold text-foreground">
                          {t("webinarLevel")}:{" "}
                        </span>
                        {isKo ? w.levelKo : w.levelEn}
                      </span>
                    </div>
                    <BtnBlock
                      variant="dark"
                      size="md"
                      onClick={() => scrollToRegister(w.id)}
                      className="w-full"
                    >
                      {t("scrollToRegister")}
                    </BtnBlock>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="academy-downloads" className="scroll-mt-24">
            <div className="mb-8 text-center">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                [ DOWNLOADS ]
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-foreground sm:text-3xl">
                {t("sectionDownloads")}
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-[12px] tracking-normal text-muted-foreground">
                {`// `}
                {t("sectionDownloadsDesc")}
              </p>
            </div>
            <div className="grid gap-0 md:grid-cols-2 lg:grid-cols-3">
              {academyDownloads.map((asset) => (
                <article
                  key={asset.id}
                  className="-mt-[2px] -ml-[2px] flex flex-col border-2 border-border bg-card"
                >
                  <div className="flex flex-1 flex-col p-5">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                    <p className="mt-3 font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                      [ ASSET / PDF ]
                    </p>
                    <h3 className="mt-1 text-base font-bold tracking-normal text-foreground">
                      {isKo ? asset.titleKo : asset.titleEn}
                    </h3>
                    <p className="mt-2 flex-1 text-[11px] leading-relaxed tracking-normal text-muted-foreground">
                      {`// `}
                      {isKo ? asset.descKo : asset.descEn}
                    </p>
                    <BtnBlock
                      variant="secondary"
                      size="md"
                      onClick={() => handleAssetPdf(asset)}
                      disabled={downloading === `asset-${asset.id}`}
                      className="mt-4 w-full"
                    >
                      {downloading === `asset-${asset.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {t("downloadPdf")}
                    </BtnBlock>
                  </div>
                </article>
              ))}
              <article className="-mt-[2px] -ml-[2px] flex flex-col border-2 border-border bg-card">
                <div className="flex flex-1 flex-col p-5">
                  <Presentation className="h-8 w-8 text-primary" />
                  <p className="mt-3 font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                    [ PPT ]
                  </p>
                  <h3 className="mt-1 text-base font-bold tracking-normal text-foreground">
                    {t("pptTitle")}
                  </h3>
                  <p className="mt-2 flex-1 text-[11px] leading-relaxed tracking-normal text-muted-foreground">
                    {`// `}
                    {t("pptDesc")}
                  </p>
                  <BtnBlock
                    variant="secondary"
                    size="md"
                    onClick={handlePpt}
                    className="mt-4 w-full"
                  >
                    <Presentation className="h-4 w-4" />
                    {t("downloadPpt")}
                  </BtnBlock>
                </div>
              </article>
              <article className="-mt-[2px] -ml-[2px] flex flex-col border-2 border-border bg-card">
                <div className="flex flex-1 flex-col p-5">
                  <MonitorPlay className="h-8 w-8 text-primary" />
                  <p className="mt-3 font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                    [ VIDEO ]
                  </p>
                  <h3 className="mt-1 text-base font-bold tracking-normal text-foreground">
                    {t("videoAssetTitle")}
                  </h3>
                  <p className="mt-2 flex-1 text-[11px] leading-relaxed tracking-normal text-muted-foreground">
                    {`// `}
                    {t("videoAssetDesc")}
                  </p>
                  <BtnBlock
                    variant="accent"
                    size="md"
                    onClick={() => {
                      setVideoEmbed(DEMO_VIDEO_EMBED);
                      setVideoTitle(t("videoAssetTitle"));
                      setVideoOpen(true);
                    }}
                    className="mt-4 w-full"
                  >
                    <Video className="h-4 w-4" />
                    {t("openVideo")}
                  </BtnBlock>
                </div>
              </article>
            </div>
          </section>

          <section
            ref={registerRef}
            id="academy-register"
            className="scroll-mt-24"
          >
            <div className="border-2 border-border bg-card">
              <header className="border-b-2 border-border p-5">
                <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                  [ REGISTER ]
                </p>
                <h3 className="mt-2 text-xl font-bold tracking-normal text-foreground">
                  {t("sectionRegister")}
                </h3>
                <p className="mt-2 text-[12px] tracking-normal text-muted-foreground">
                  {`// `}
                  {t("sectionRegisterDesc")}
                </p>
              </header>
              <div className="p-5">
                <form
                  className="grid gap-4 sm:grid-cols-2"
                  onSubmit={submitRegistration}
                >
                  <div className="sm:col-span-2">
                    <label className={labelCls} htmlFor="ac-webinar">
                      [ {t("registerSelect")} ]
                    </label>
                    <select
                      id="ac-webinar"
                      required
                      className={cn(inputCls, "mt-2")}
                      value={regWebinar}
                      onChange={(e) => setRegWebinar(e.target.value)}
                    >
                      <option value="">{t("registerPick")}</option>
                      {academyWebinars.map((w) => (
                        <option key={w.id} value={w.id}>
                          {isKo ? w.titleKo : w.titleEn}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="ac-name">
                      [ {t("registerName")} ]
                    </label>
                    <input
                      id="ac-name"
                      className={cn(inputCls, "mt-2")}
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="ac-email">
                      [ {t("registerEmail")} ]
                    </label>
                    <input
                      id="ac-email"
                      type="email"
                      className={cn(inputCls, "mt-2")}
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls} htmlFor="ac-co">
                      [ {t("registerCompany")} ]
                    </label>
                    <input
                      id="ac-co"
                      className={cn(inputCls, "mt-2")}
                      value={regCompany}
                      onChange={(e) => setRegCompany(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <BtnBlock
                      type="submit"
                      variant="dark"
                      size="md"
                      disabled={regSubmitting}
                    >
                      {regSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      {t("registerSubmit")}
                    </BtnBlock>
                  </div>
                </form>
              </div>
            </div>
          </section>

          <section
            id="academy-consult"
            className="scroll-mt-24 border-2 border-primary bg-hero-void px-6 pb-12 pt-12 text-center sm:pb-16"
          >
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
              [ {t("consultSectionTitle")} ]
            </p>
            <h2 className="mt-3 text-xl font-bold tracking-normal text-hero-fg sm:text-2xl">
              {t("ctaTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[12px] tracking-normal text-hero-fg/75">
              {`// `}
              {t("consultSectionDesc")}
            </p>
            <div className="mt-6 inline-flex">
              <BtnBlock
                href="/contact?topic=academy"
                variant="accent"
                size="lg"
              >
                {t("ctaButton")}
              </BtnBlock>
            </div>
          </section>
        </div>

        <Modal
          open={!!pdfModalAsset}
          onClose={() => setPdfModalAsset(null)}
          className="max-w-md"
          ariaLabel={isKo ? "PDF 다운로드" : "PDF download"}
        >
          {pdfModalAsset ? (
            <form
              className="border-2 border-border bg-card p-5 pt-12"
              onSubmit={submitPdfDownload}
            >
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                [ PDF ]
              </p>
              <h3 className="mt-2 text-lg font-bold text-foreground">
                {isKo ? pdfModalAsset.titleKo : pdfModalAsset.titleEn}
              </h3>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {isKo
                  ? "이메일을 입력하면 PDF 링크를 보내드립니다."
                  : "Enter your email to receive the PDF link."}
              </p>
              <label className={cn(labelCls, "mt-4")} htmlFor="pdf-email">
                [ EMAIL ]
              </label>
              <input
                id="pdf-email"
                type="email"
                required
                className={cn(inputCls, "mt-2")}
                value={pdfEmail}
                onChange={(e) => setPdfEmail(e.target.value)}
                placeholder="you@company.com"
              />
              <BtnBlock
                type="submit"
                variant="accent"
                size="md"
                className="mt-4 w-full"
                disabled={downloading === `asset-${pdfModalAsset.id}`}
              >
                {downloading === `asset-${pdfModalAsset.id}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {t("downloadPdf")}
              </BtnBlock>
            </form>
          ) : null}
        </Modal>

        <Modal
          open={videoOpen}
          onClose={closeVideo}
          className="max-w-4xl"
          ariaLabel={t("videoModalTitle")}
        >
          <div className="border-2 border-border bg-card p-4 pt-12 sm:p-6">
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
              [ VIDEO ]
            </p>
            <h3 className="mt-2 pr-10 text-lg font-bold tracking-normal text-foreground">
              {videoTitle}
            </h3>
            <div className="mt-4 aspect-video w-full overflow-hidden border-2 border-border bg-hero-void">
              <iframe
                title={videoTitle}
                src={videoEmbed}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </Modal>
      </div>
    </HomeLandingDayNight>
  );
}
