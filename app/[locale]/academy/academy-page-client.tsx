"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import Modal from "@/components/ui/modal";
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

const inputCls =
  "h-10 w-full border-2 border-border bg-card px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";
const labelCls =
  "block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary";

export default function AcademyPageClient({
  dbLessons,
}: {
  dbLessons: AcademyLesson[];
}) {
  const t = useTranslations("academy");
  const locale = useLocale();
  const isKo = locale === "ko";
  const { toast } = useToast();
  const registerRef = useRef<HTMLElement | null>(null);

  const [videoOpen, setVideoOpen] = useState(false);
  const [videoEmbed, setVideoEmbed] = useState(DEMO_VIDEO_EMBED);
  const [videoTitle, setVideoTitle] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

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

  const handleAssetPdf = async (asset: AcademyDownload) => {
    setDownloading(`asset-${asset.id}`);
    try {
      await downloadAcademyAssetPdf(asset, isKo);
      toast("success", t("toastAsset"));
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

  const submitRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail.trim() || !regEmail.includes("@")) {
      toast("warning", t("registerEmailInvalid"));
      return;
    }
    if (!regWebinar) {
      return;
    }
    setRegSubmitting(true);
    setTimeout(() => {
      toast("success", t("registerSuccess"));
      setRegName("");
      setRegEmail("");
      setRegCompany("");
      setRegSubmitting(false);
    }, 500);
  };

  const formatWebinarWhen = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(isKo ? "ko-KR" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  return (
    <>
      <section className="bg-hero-void py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
            {`// 10 / Academy`}
          </p>
          <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-2 border-2 border-primary bg-primary px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
              {t("heroBadge")}
            </span>
            <span className="border-2 border-hero-fg bg-card px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-foreground">
              BETA
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-hero-fg sm:text-5xl lg:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl font-mono text-[12px] tracking-tight text-hero-fg/75 sm:text-sm">
            {t("heroSubtitle")}
          </p>
        </div>
      </section>

      <section className="bg-card py-8">
        <div className="mx-auto grid max-w-7xl gap-0 px-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-6 lg:px-8">
          {[
            { href: "#academy-basics", icon: Video, t: "valueStripBasics", d: "valueStripBasicsDesc" },
            { href: "#academy-webinars", icon: Calendar, t: "valueStripWebinars", d: "valueStripWebinarsDesc" },
            { href: "#academy-downloads", icon: Download, t: "valueStripDownloads", d: "valueStripDownloadsDesc" },
            { href: "#academy-consult", icon: MessageCircle, t: "valueStripConsult", d: "valueStripConsultDesc" },
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
                <p className="text-sm font-bold tracking-tight">{t(titleKey as "valueStripBasics")}</p>
                <p className="mt-1 font-mono text-[11px] tracking-tight opacity-75">
                  {`// `}{t(descKey as "valueStripBasicsDesc")}
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 bg-muted px-4 py-14 sm:px-6 lg:px-8">
        <section id="academy-basics" className="scroll-mt-24">
          <div className="mb-8 text-center">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              [ BASICS ]
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("sectionBasics")}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl font-mono text-[12px] tracking-tight text-muted-foreground">
              {`// `}{t("sectionBasicsDesc")}
            </p>
          </div>
          {dbLessons.length === 0 ? (
            <div className="border-2 border-border bg-card py-12 text-center">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                [ PREPARING ]
              </p>
              <p className="mt-3 text-base font-bold text-foreground">
                {t("preparingLessons")}
              </p>
              <p className="mx-auto mt-2 max-w-md font-mono text-[12px] tracking-tight text-muted-foreground">
                {t("preparingLessonsDesc")}
              </p>
            </div>
          ) : (
            <div className="grid gap-0 lg:grid-cols-3">
              {dbLessons.map((lesson) => (
                <article
                  key={lesson.id}
                  className="-mt-[2px] -ml-[2px] flex flex-col border-2 border-border bg-card"
                >
                  <header className="border-b-2 border-border p-5">
                    <span className="inline-flex w-fit border-2 border-primary bg-primary px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground">
                      [ {t("minutes", { n: lesson.durationMin })} ]
                    </span>
                    <h3 className="mt-3 text-lg font-bold tracking-tight text-foreground">
                      {isKo ? lesson.titleKo : lesson.titleEn}
                    </h3>
                    <p className="mt-2 font-mono text-[12px] leading-relaxed tracking-tight text-muted-foreground">
                      {`// `}{isKo ? lesson.descKo : lesson.descEn}
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
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              [ WEBINARS ]
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("sectionWebinars")}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl font-mono text-[12px] tracking-tight text-muted-foreground">
              {`// `}{t("sectionWebinarsDesc")}
            </p>
          </div>
          <div className="grid gap-0 md:grid-cols-2">
            {academyWebinars.map((w) => (
              <article
                key={w.id}
                className="-mt-[2px] -ml-[2px] border-2 border-border bg-card"
              >
                <header className="border-b-2 border-border p-5">
                  <span className="inline-flex w-fit border-2 border-primary bg-primary px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground">
                    [ {t("badgeLive")} ]
                  </span>
                  <h3 className="mt-3 text-lg font-bold tracking-tight text-foreground">
                    {isKo ? w.titleKo : w.titleEn}
                  </h3>
                  <p className="mt-2 font-mono text-[12px] leading-relaxed tracking-tight text-muted-foreground">
                    {`// `}{isKo ? w.descKo : w.descEn}
                  </p>
                </header>
                <div className="space-y-3 p-5 text-sm">
                  <div className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-bold text-foreground">{t("webinarWhen")}: </span>
                      {formatWebinarWhen(w.datetimeIso)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-bold text-foreground">{t("webinarSeats")}: </span>
                      {t("seatsCount", { n: w.seatsLeft })}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-bold text-foreground">{t("webinarLevel")}: </span>
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
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              [ DOWNLOADS ]
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("sectionDownloads")}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl font-mono text-[12px] tracking-tight text-muted-foreground">
              {`// `}{t("sectionDownloadsDesc")}
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
                  <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                    [ ASSET / PDF ]
                  </p>
                  <h3 className="mt-1 text-base font-bold tracking-tight text-foreground">
                    {isKo ? asset.titleKo : asset.titleEn}
                  </h3>
                  <p className="mt-2 flex-1 font-mono text-[11px] leading-relaxed tracking-tight text-muted-foreground">
                    {`// `}{isKo ? asset.descKo : asset.descEn}
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
                <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                  [ PPT ]
                </p>
                <h3 className="mt-1 text-base font-bold tracking-tight text-foreground">
                  {t("pptTitle")}
                </h3>
                <p className="mt-2 flex-1 font-mono text-[11px] leading-relaxed tracking-tight text-muted-foreground">
                  {`// `}{t("pptDesc")}
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
                <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                  [ VIDEO ]
                </p>
                <h3 className="mt-1 text-base font-bold tracking-tight text-foreground">
                  {t("videoAssetTitle")}
                </h3>
                <p className="mt-2 flex-1 font-mono text-[11px] leading-relaxed tracking-tight text-muted-foreground">
                  {`// `}{t("videoAssetDesc")}
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
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                [ REGISTER ]
              </p>
              <h3 className="mt-2 text-xl font-bold tracking-tight text-foreground">
                {t("sectionRegister")}
              </h3>
              <p className="mt-2 font-mono text-[12px] tracking-tight text-muted-foreground">
                {`// `}{t("sectionRegisterDesc")}
              </p>
            </header>
            <div className="p-5">
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitRegistration}>
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
          className="scroll-mt-24 border-2 border-primary bg-hero-void px-6 py-12 text-center"
        >
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            [ {t("consultSectionTitle")} ]
          </p>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-hero-fg sm:text-2xl">
            {t("ctaTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl font-mono text-[12px] tracking-tight text-hero-fg/75">
            {`// `}{t("consultSectionDesc")}
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
        open={videoOpen}
        onClose={closeVideo}
        className="max-w-4xl"
        ariaLabel={t("videoModalTitle")}
      >
        <div className="border-2 border-border bg-card p-4 pt-12 sm:p-6">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            [ VIDEO ]
          </p>
          <h3 className="mt-2 pr-10 text-lg font-bold tracking-tight text-foreground">
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
    </>
  );
}
