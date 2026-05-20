"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  hasUnseenProofPhotos,
  writeProofSeenAt,
} from "@/lib/campaign-proof-seen";

export type ProofPhotoItem = {
  id: string;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
};

type Props = {
  campaignId: string;
  initialPhotos: ProofPhotoItem[];
  initialLatestAt: string | null;
  isKo: boolean;
  scrollOnMount?: boolean;
};

export function CampaignProofSection({
  campaignId,
  initialPhotos,
  initialLatestAt,
  isKo,
  scrollOnMount,
}: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const [photos, setPhotos] = useState(initialPhotos);
  const [latestAt, setLatestAt] = useState(initialLatestAt);
  const [unseen, setUnseen] = useState(() =>
    hasUnseenProofPhotos(initialLatestAt, campaignId),
  );

  const markSeen = useCallback(() => {
    if (!latestAt) return;
    writeProofSeenAt(campaignId, latestAt);
    setUnseen(false);
  }, [campaignId, latestAt]);

  useEffect(() => {
    if (scrollOnMount && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      markSeen();
    }
  }, [scrollOnMount, markSeen]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) markSeen();
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [markSeen]);

  useEffect(() => {
    setUnseen(hasUnseenProofPhotos(latestAt, campaignId));
  }, [latestAt, campaignId]);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/my/dashboard/campaigns/${encodeURIComponent(campaignId)}/proof-photos`,
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          photos?: ProofPhotoItem[];
          latestProofAt?: string | null;
        };
        if (cancelled || !data.photos) return;
        setPhotos(data.photos);
        setLatestAt(data.latestProofAt ?? null);
      } catch {
        /* ignore */
      }
    };
    void poll();
    const id = window.setInterval(() => void poll(), 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [campaignId]);

  return (
    <section ref={sectionRef} id="proof" className="mt-8 scroll-mt-24">
      <h2 className="mb-3 flex items-center gap-2 font-mono text-[11px] font-black uppercase tracking-[0.24em]">
        {isKo ? "인증 사진" : "Proof photos"}
        {unseen ? (
          <span
            className="inline-flex h-2 w-2 rounded-full bg-red-500"
            aria-label={isKo ? "새 인증 사진" : "New proof photos"}
          />
        ) : null}
      </h2>
      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isKo ? "업로드된 인증 사진이 없습니다." : "No proof photos yet."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((p) => (
            <a
              key={p.id}
              href={p.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-[4/3] overflow-hidden rounded-[14px] border border-border bg-muted"
            >
              <Image
                src={p.imageUrl}
                alt={p.caption ?? ""}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width:640px) 50vw, 33vw"
                unoptimized
              />
              {p.caption ? (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-[10px] text-white">
                  {p.caption}
                </span>
              ) : null}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
