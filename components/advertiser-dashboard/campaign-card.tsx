"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ChevronRight, ImageIcon } from "lucide-react";
import type { CampaignStatus } from "@prisma/client";

export type AdvertiserCampaignCardItem = {
  id: string;
  name: string;
  status: CampaignStatus;
  startDate: string | null;
  endDate: string | null;
  mediaNames: string[];
  impressionsTotal: number;
  proofThumbUrl: string | null;
  proofCount: number;
};

const STATUS_LABEL: Record<string, { ko: string; en: string }> = {
  proposal: { ko: "제안", en: "Proposal" },
  negotiation: { ko: "협의", en: "Negotiation" },
  contract: { ko: "계약", en: "Contract" },
  production: { ko: "제작", en: "Production" },
  airing: { ko: "집행 중", en: "Live" },
  completed: { ko: "완료", en: "Done" },
};

type Props = {
  item: AdvertiserCampaignCardItem;
  isKo: boolean;
};

export function AdvertiserCampaignCard({ item, isKo }: Props) {
  const period =
    item.startDate && item.endDate
      ? `${item.startDate} ~ ${item.endDate}`
      : item.startDate ?? "—";
  const mediaLabel =
    item.mediaNames.length > 0
      ? item.mediaNames.slice(0, 2).join(", ") +
        (item.mediaNames.length > 2 ? ` +${item.mediaNames.length - 2}` : "")
      : isKo
        ? "매체 배정 전"
        : "Media TBD";
  const status =
    STATUS_LABEL[item.status]?.[isKo ? "ko" : "en"] ?? item.status;

  return (
    <Link
      href={`/dashboard/campaigns/${item.id}`}
      className="flex gap-3 rounded-[20px] border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/40 active:bg-muted/40"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[14px] bg-muted">
        {item.proofThumbUrl ? (
          <Image
            src={item.proofThumbUrl}
            alt=""
            fill
            className="object-cover"
            sizes="80px"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-6 w-6" aria-hidden />
          </div>
        )}
        {item.proofCount > 0 ? (
          <span className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[9px] text-white">
            {item.proofCount}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-semibold leading-snug">{item.name}</p>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{mediaLabel}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {period}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {status}
          </span>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {isKo ? "노출 " : "Imp "}
            {item.impressionsTotal.toLocaleString(isKo ? "ko-KR" : "en-US")}
            {isKo ? " (추정)" : " (est.)"}
          </span>
        </div>
      </div>
    </Link>
  );
}
