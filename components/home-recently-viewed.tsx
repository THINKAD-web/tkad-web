"use client";

import { useState, useEffect } from "react";
import { Clock, MapPin, Monitor, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import { typeLabels, type MediaItem } from "@/lib/media-data";
import ScrollAnimate from "@/components/scroll-animate";

interface Props {
  locale: string;
}

export default function HomeRecentlyViewed({ locale }: Props) {
  const isKo = locale === "ko";
  const [items, setItems] = useState<MediaItem[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage on mount
    setItems(getRecentlyViewed());
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollAnimate>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-navy/70">
                <Clock className="h-4 w-4" />
                {isKo ? "최근 본 매체" : "Recently Viewed"}
              </div>
              <h2 className="mt-1 text-2xl font-bold text-navy">
                {isKo ? "최근 확인한 매체" : "Recently Viewed Media"}
              </h2>
            </div>
            <Link
              href="/media"
              className="link-underline-grow inline-flex min-h-11 shrink-0 items-center gap-1 self-start text-sm font-semibold text-gold transition-colors hover:text-gold-dark sm:min-h-0 sm:self-auto"
            >
              {isKo ? "전체 보기" : "View All"} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </ScrollAnimate>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {items.slice(0, 3).map((media, i) => (
            <ScrollAnimate key={media.id} delay={i * 100}>
              <Link href={`/media/${media.id}`} className="block touch-manipulation">
                <Card className="group cursor-pointer overflow-hidden border-0 shadow-md transition-all hover:shadow-lg hover:-translate-y-1">
                  <div className="flex h-28 items-center justify-center bg-gradient-to-br from-navy/5 to-navy/10">
                    <Monitor className="h-8 w-8 text-navy/15 transition-transform group-hover:scale-110" />
                  </div>
                  <CardHeader className="p-4 pb-1">
                    <Badge variant="secondary" className="w-fit bg-navy/5 text-navy text-[10px]">
                      {isKo ? typeLabels[media.type]?.ko : typeLabels[media.type]?.en}
                    </Badge>
                    <CardTitle className="text-sm font-bold">
                      {isKo ? media.name : media.nameEn}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {isKo ? media.location : media.locationEn}
                    </div>
                    <div className="mt-1.5 text-base font-bold text-navy">
                      ₩{media.price.toLocaleString()}
                      <span className="text-[10px] font-normal text-muted-foreground">만원</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </ScrollAnimate>
          ))}
        </div>
      </div>
    </section>
  );
}
