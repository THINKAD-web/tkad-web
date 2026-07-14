"use client";

import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import { BtnBlock } from "@/components/brutalist";
import {
  FileText,
  Download,
  Building2,
  Monitor,
  Trophy,
} from "lucide-react";
import { useState } from "react";

const LeadCaptureModal = dynamic(() =>
  import("@/components/lead-capture-modal").then((m) => ({
    default: m.LeadCaptureModal,
  })),
);

type Resource = {
  id: string;
  icon: typeof FileText;
  titleKo: string;
  titleEn: string;
  descriptionKo: string;
  descriptionEn: string;
  fileSize: string;
  pages: number;
};

const resources: Resource[] = [
  {
    id: "company-profile",
    icon: Building2,
    titleKo: "회사소개서",
    titleEn: "Company Profile",
    descriptionKo:
      "THINKAD(싱커드)의 비전, 핵심 역량, 주요 서비스를 소개합니다.",
    descriptionEn:
      "Learn about THINKAD's vision, core capabilities, and key services.",
    fileSize: "8.2 MB",
    pages: 24,
  },
  {
    id: "media-guide",
    icon: Monitor,
    titleKo: "매체소개서 (샘플)",
    titleEn: "Media Guide (Sample)",
    descriptionKo:
      "전국 주요 OOH 매체 현황 및 단가 정보가 포함된 가이드입니다.",
    descriptionEn:
      "A guide featuring nationwide OOH media availability and pricing information.",
    fileSize: "12.5 MB",
    pages: 36,
  },
  {
    id: "case-studies",
    icon: Trophy,
    titleKo: "성공사례집",
    titleEn: "Case Study Collection",
    descriptionKo:
      "업종별 OOH 광고 캠페인 사례와 성과 데이터를 확인하세요.",
    descriptionEn:
      "Review OOH advertising campaign cases and performance data by industry.",
    fileSize: "15.3 MB",
    pages: 42,
  },
];

export default function ResourcesPage() {
  const locale = useLocale();
  const isKo = locale === "ko";

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null
  );

  const handleDownloadClick = (resource: Resource) => {
    setSelectedResource(resource);
    setModalOpen(true);
  };

  const handleLeadSubmit = () => {
    // TODO: persist lead capture to backend
  };

  return (
    <>
      <section className="bg-hero-void py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
            {`// 14 / Resources`}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-hero-fg sm:text-5xl lg:text-6xl">
            {isKo ? "리소스 센터" : "Resource Center"}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[12px] tracking-tight text-hero-fg/75 sm:text-sm">
            {isKo
              ? "THINKAD의 자료를 다운로드하세요"
              : "Download THINKAD resources"}
          </p>
        </div>
      </section>

      <section className="bg-muted py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-0">
            {resources.map((resource) => (
              <article
                key={resource.id}
                className="-mt-[2px] overflow-hidden border-2 border-border bg-card"
              >
                <div className="flex flex-col sm:flex-row">
                  <div className="flex shrink-0 items-center justify-center border-b-2 border-border bg-hero-void p-8 sm:w-48 sm:border-b-0 sm:border-r-2">
                    <resource.icon className="h-16 w-16 text-accent" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <header className="border-b-2 border-border p-5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 border-2 border-accent bg-accent px-2 py-0.5 font-display text-xs font-medium uppercase tracking-[0.22em] text-accent-foreground">
                          <FileText className="h-3 w-3" />
                          PDF
                        </span>
                        <span className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          {resource.fileSize} · {resource.pages}{" "}
                          {isKo ? "페이지" : "pages"}
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-bold tracking-tight text-foreground">
                        {isKo ? resource.titleKo : resource.titleEn}
                      </h3>
                    </header>
                    <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                      <p className="text-[12px] leading-relaxed tracking-tight text-muted-foreground">
                        {`// `}{isKo
                          ? resource.descriptionKo
                          : resource.descriptionEn}
                      </p>
                      <BtnBlock
                        variant="accent"
                        size="md"
                        onClick={() => handleDownloadClick(resource)}
                        className="w-full sm:w-auto sm:self-start"
                      >
                        <Download className="h-4 w-4" />
                        {isKo ? "다운로드" : "Download"}
                      </BtnBlock>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-12 border-2 border-accent bg-hero-void p-8 text-center">
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
              [ NEED MORE? ]
            </p>
            <h3 className="mt-3 text-lg font-bold tracking-tight text-hero-fg">
              {isKo
                ? "더 많은 자료가 필요하신가요?"
                : "Need more resources?"}
            </h3>
            <p className="mt-3 text-[12px] tracking-tight text-hero-fg/75">
              {`// `}{isKo
                ? "맞춤형 자료가 필요하시면 언제든 문의해 주세요."
                : "Contact us anytime if you need customized materials."}
            </p>
            <div className="mt-5 inline-flex">
              <BtnBlock
                href="/contact"
                variant="accent"
                size="md"
              >
                {isKo ? "문의하기" : "Contact Us"}
              </BtnBlock>
            </div>
          </div>
        </div>
      </section>

      <LeadCaptureModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleLeadSubmit}
        title={
          selectedResource
            ? isKo
              ? `${selectedResource.titleKo} 다운로드`
              : `Download ${selectedResource.titleEn}`
            : undefined
        }
        description={
          isKo
            ? "정보를 입력하시면 다운로드 링크를 이메일로 보내드립니다."
            : "Enter your details and we will email you the download link."
        }
        locale={locale}
      />
    </>
  );
}
