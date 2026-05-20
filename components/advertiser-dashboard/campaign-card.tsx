"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ChevronRight, ImageIcon } from "lucide-react";
import type { CampaignStatus } from "@prisma/client";
import { hasUnseenProofPhotos } from "@/lib/campaign-proof-seen";
import { cn } from "@/lib/utils";

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
  latestProofAt: string | null;
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
  const hasNewProof = hasUnseenProofPhotos(item.latestProofAt, item.id);

  return (
    <Link
      href={`/dashboard/campaigns/${item.id}?tab=proof`}
      className={cn(
        "tkad-glass-surface tkad-neon-border flex gap-4 rounded-[28px] border p-4 backdrop-blur-md sm:p-5",
        "transition-all hover:-translate-y-0.5 hover:border-primary/25 active:scale-[0.99]",
      )}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[18px] border border-border bg-muted/40 sm:h-28 sm:w-28">
        {item.proofThumbUrl ? (
          <Image
            src={item.proofThumbUrl}
            alt=""
            fill
            className="object-cover"
            sizes="112px"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-8 w-8" aria-hidden />
          </div>
        )}
        {hasNewProof ? (
          <span
            className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background"
            aria-label={isKo ? "새 인증 사진" : "New proof photos"}
          />
        ) : null}
        {item.proofCount > 0 ? (
          <span className="absolute bottom-1.5 right-1.5 rounded-lg bg-foreground/80 px-2 py-0.5 font-mono text-[10px] font-bold text-background">
            {item.proofCount}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-lg font-bold leading-snug text-foreground sm:text-xl">
            {item.name}
          </p>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">{mediaLabel}</p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {period}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            {status}
          </span>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {isKo ? "노출 " : "Imp "}
            {item.impressionsTotal.toLocaleString(isKo ? "ko-KR" : "en-US")}
            {isKo ? " (추정)" : " (est.)"}
          </span>
        </div>
      </div>
    </Link>
  );
}
