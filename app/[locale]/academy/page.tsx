"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Calendar,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Loader2,
  MonitorPlay,
  Presentation,
  Users,
  Video,
} from "lucide-react";
import {
  DEMO_VIDEO_EMBED,
  academyDownloads,
  academyLessons,
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

export default function AcademyPage() {
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
      <section className="bg-navy py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-bold text-gold">
              <GraduationCap className="h-4 w-4" />
              Academy
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{t("heroTitle")}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">{t("heroSubtitle")}</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-14 sm:px-6 lg:px-8">
        <section>
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-navy">{t("sectionBasics")}</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
              {t("sectionBasicsDesc")}
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {academyLessons.map((lesson) => (
              <Card
                key={lesson.id}
                className="flex flex-col border-navy/10 shadow-md transition-shadow hover:shadow-lg"
              >
                <CardHeader>
                  <Badge variant="outline" className="mb-2 w-fit border-gold/40 text-gold-dark">
                    {t("minutes", { n: lesson.durationMin })}
                  </Badge>
                  <CardTitle className="text-lg text-navy">
                    {isKo ? lesson.titleKo : lesson.titleEn}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {isKo ? lesson.descKo : lesson.descEn}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-navy/20"
                    onClick={() => openLessonVideo(lesson)}
                  >
                    <Video className="mr-2 h-4 w-4 text-gold" />
                    {t("watchVideo")}
                  </Button>
                  <Button
                    type="button"
                    className="w-full bg-gold font-bold text-navy hover:bg-gold-dark"
                    onClick={() => handleOutline(lesson)}
                    disabled={downloading === `outline-${lesson.id}`}
                  >
                    {downloading === `outline-${lesson.id}` ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {t("downloadOutline")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-navy">{t("sectionWebinars")}</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
              {t("sectionWebinarsDesc")}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {academyWebinars.map((w) => (
              <Card key={w.id} className="border-navy/10 shadow-md">
                <CardHeader>
                  <Badge className="w-fit bg-navy text-white">{t("badgeLive")}</Badge>
                  <CardTitle className="text-lg text-navy">
                    {isKo ? w.titleKo : w.titleEn}
                  </CardTitle>
                  <CardDescription>{isKo ? w.descKo : w.descEn}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-4 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-4 w-4 text-gold" />
                      <span className="font-semibold text-navy">{t("webinarWhen")}: </span>
                      {formatWebinarWhen(w.datetimeIso)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-4 w-4 text-gold" />
                      <span className="font-semibold text-navy">{t("webinarSeats")}: </span>
                      {t("seatsCount", { n: w.seatsLeft })}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-semibold text-navy">{t("webinarLevel")}: </span>
                      {isKo ? w.levelKo : w.levelEn}
                    </span>
                  </div>
                  <Button
                    type="button"
                    className="w-full bg-navy text-white hover:bg-navy/90"
                    onClick={() => scrollToRegister(w.id)}
                  >
                    {t("scrollToRegister")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-navy">{t("sectionDownloads")}</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
              {t("sectionDownloadsDesc")}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {academyDownloads.map((asset) => (
              <Card key={asset.id} className="border-navy/10 shadow-sm">
                <CardHeader className="pb-2">
                  <FileSpreadsheet className="h-8 w-8 text-gold" />
                  <CardTitle className="text-base text-navy">
                    {isKo ? asset.titleKo : asset.titleEn}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isKo ? asset.descKo : asset.descEn}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-navy/20 font-semibold"
                    onClick={() => handleAssetPdf(asset)}
                    disabled={downloading === `asset-${asset.id}`}
                  >
                    {downloading === `asset-${asset.id}` ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {t("downloadPdf")}
                  </Button>
                </CardContent>
              </Card>
            ))}
            <Card className="border-navy/10 shadow-sm">
              <CardHeader className="pb-2">
                <Presentation className="h-8 w-8 text-gold" />
                <CardTitle className="text-base text-navy">{t("pptTitle")}</CardTitle>
                <CardDescription className="text-xs">{t("pptDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-navy/20 font-semibold"
                  onClick={handlePpt}
                >
                  <Presentation className="mr-2 h-4 w-4" />
                  {t("downloadPpt")}
                </Button>
              </CardContent>
            </Card>
            <Card className="border-navy/10 shadow-sm">
              <CardHeader className="pb-2">
                <MonitorPlay className="h-8 w-8 text-gold" />
                <CardTitle className="text-base text-navy">{t("videoAssetTitle")}</CardTitle>
                <CardDescription className="text-xs">{t("videoAssetDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  className="w-full bg-gold font-bold text-navy hover:bg-gold-dark"
                  onClick={() => {
                    setVideoEmbed(DEMO_VIDEO_EMBED);
                    setVideoTitle(t("videoAssetTitle"));
                    setVideoOpen(true);
                  }}
                >
                  <Video className="mr-2 h-4 w-4" />
                  {t("openVideo")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section ref={registerRef} id="webinar-register" className="scroll-mt-24">
          <Card className="border-navy/10 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-navy">{t("sectionRegister")}</CardTitle>
              <CardDescription>{t("sectionRegisterDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitRegistration}>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-navy/70" htmlFor="ac-webinar">
                    {t("registerSelect")}
                  </label>
                  <select
                    id="ac-webinar"
                    required
                    className="mt-1 flex h-10 w-full rounded-md border border-navy/15 bg-white px-3 text-sm text-navy shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
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
                  <label className="text-xs font-semibold text-navy/70" htmlFor="ac-name">
                    {t("registerName")}
                  </label>
                  <Input
                    id="ac-name"
                    className="mt-1"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-navy/70" htmlFor="ac-email">
                    {t("registerEmail")}
                  </label>
                  <Input
                    id="ac-email"
                    type="email"
                    className="mt-1"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-navy/70" htmlFor="ac-co">
                    {t("registerCompany")}
                  </label>
                  <Input
                    id="ac-co"
                    className="mt-1"
                    value={regCompany}
                    onChange={(e) => setRegCompany(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button
                    type="submit"
                    className="bg-navy text-white hover:bg-navy/90"
                    disabled={regSubmitting}
                  >
                    {regSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {t("registerSubmit")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        <section
          className={cn(
            "rounded-2xl border border-navy/10 bg-gradient-to-br from-navy/[0.04] to-gold/10 px-6 py-12 text-center",
          )}
        >
          <h2 className="text-xl font-bold text-navy sm:text-2xl">{t("ctaTitle")}</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-navy/70">{t("ctaDesc")}</p>
          <Button
            asChild
            className="mt-6 bg-gold px-8 font-bold text-navy hover:bg-gold-dark"
          >
            <Link href="/contact?topic=academy">{t("ctaButton")}</Link>
          </Button>
        </section>
      </div>

      <Modal
        open={videoOpen}
        onClose={closeVideo}
        className="max-w-4xl"
        ariaLabel={t("videoModalTitle")}
      >
        <div className="p-4 pt-12 sm:p-6">
          <h3 className="pr-10 text-lg font-bold text-navy">{videoTitle}</h3>
          <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl bg-black">
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
