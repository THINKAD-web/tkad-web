"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Eye } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  lat?: number | null;
  lng?: number | null;
  mediaName: string;
};

/**
 * Kakao 로드뷰 임베드 카드.
 * 좌표 없으면 컴포넌트는 null 반환.
 * 사용자가 "로드뷰 열기" 버튼을 누를 때까지 iframe 미로드 (성능·과금 절감).
 */
export function RoadviewCard({ lat, lng, mediaName }: Props) {
  const t = useTranslations("mediaDetail.roadview");
  const [open, setOpen] = useState(false);

  if (lat == null || lng == null) return null;

  // Kakao 로드뷰 공식 임베드 URL (앱 키 없이 동작)
  const src = `https://map.kakao.com/?from=roughmap&srcid=&urlX=${lng}&urlY=${lat}&urlLevel=3&urlText=${encodeURIComponent(
    mediaName,
  )}&map_type=ROADVIEW`;
  const externalHref = `https://map.kakao.com/link/roadview/${mediaName},${lat},${lng}`;

  return (
    <Card className="border-navy/10 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-navy">
            <Eye className="h-5 w-5 text-gold" aria-hidden />
            {t("title")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("desc")}</p>
        </div>
        <Button
          type="button"
          asChild
          variant="outline"
          size="sm"
          className="rounded-full border-navy/20"
        >
          <a
            href={externalHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("externalAria")}
          >
            <ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden />
            {t("openExternal")}
          </a>
        </Button>
      </CardHeader>
      <CardContent>
        {open ? (
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-navy/10">
            <iframe
              src={src}
              title={t("iframeTitle", { name: mediaName })}
              loading="lazy"
              className="h-full w-full"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex aspect-video w-full items-center justify-center rounded-xl border-2 border-dashed border-navy/15 bg-slate-50 text-sm font-semibold text-navy transition hover:border-gold/40 hover:bg-gold/5"
          >
            <Eye className="mr-2 h-4 w-4 text-gold" aria-hidden />
            {t("loadCta")}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
