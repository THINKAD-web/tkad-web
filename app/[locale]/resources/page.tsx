"use client";

import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
      <section className="bg-navy py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {isKo ? "리소스 센터" : "Resource Center"}
          </h1>
          <p className="mt-2 text-slate-300">
            {isKo
              ? "THINKAD의 자료를 다운로드하세요"
              : "Download THINKAD resources"}
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6">
            {resources.map((resource) => (
              <Card
                key={resource.id}
                className="overflow-hidden transition-shadow hover:shadow-lg"
              >
                <div className="flex flex-col sm:flex-row">
                  <div className="flex shrink-0 items-center justify-center bg-gradient-to-br from-navy/5 to-navy/10 p-8 sm:w-48">
                    <resource.icon className="h-16 w-16 text-navy/30" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-navy/5 px-2.5 py-0.5 text-xs font-medium text-navy">
                          <FileText className="h-3 w-3" />
                          PDF
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {resource.fileSize} · {resource.pages}{" "}
                          {isKo ? "페이지" : "pages"}
                        </span>
                      </div>
                      <CardTitle className="text-lg">
                        {isKo ? resource.titleKo : resource.titleEn}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col justify-between gap-4">
                      <p className="text-sm text-muted-foreground">
                        {isKo
                          ? resource.descriptionKo
                          : resource.descriptionEn}
                      </p>
                      <Button
                        onClick={() => handleDownloadClick(resource)}
                        className="w-full bg-gold font-semibold text-navy hover:bg-gold-dark sm:w-auto sm:self-start"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {isKo ? "다운로드" : "Download"}
                      </Button>
                    </CardContent>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-12 rounded-2xl bg-slate-50 p-8 text-center">
            <h3 className="text-lg font-bold text-navy">
              {isKo
                ? "더 많은 자료가 필요하신가요?"
                : "Need more resources?"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {isKo
                ? "맞춤형 자료가 필요하시면 언제든 문의해 주세요."
                : "Contact us anytime if you need customized materials."}
            </p>
            <Button
              variant="outline"
              className="mt-4 rounded-full border-navy/20 font-semibold text-navy hover:bg-navy/5"
              onClick={() => (window.location.href = `/${locale}/contact`)}
            >
              {isKo ? "문의하기" : "Contact Us"}
            </Button>
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
