import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { AnalyticsSettingsForm } from "./analytics-settings-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminAnalyticsSettingsPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";

  return (
    <div className="space-y-6 text-foreground">
      <div className="space-y-3">
        <Link
          href={`/${locale}/admin/analytics`}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {isKo ? "분석 대시보드로 돌아가기" : "Back to analytics dashboard"}
        </Link>

        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            [ TRACKING SETTINGS ]
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight">
            {isKo ? "방문자 분석 등록 관리" : "Visitor Analytics Settings"}
          </h2>
          <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
            {isKo
              ? "// GA4 와 GTM 식별자를 저장하고 공개 사이트 반영 여부를 관리합니다."
              : "// Store GA4 and GTM identifiers and control whether they are active on the public site."}
          </p>
        </div>
      </div>

      <AnalyticsSettingsForm locale={locale} />
    </div>
  );
}
