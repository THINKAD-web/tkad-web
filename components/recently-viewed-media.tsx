"use client";

import { useState, useEffect } from "react";
import { Clock, MapPin, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import { typeLabels, type MediaItem } from "@/lib/media-data";

interface Props {
  locale: string;
  onSelect?: (media: MediaItem) => void;
}

export default function RecentlyViewedMedia({ locale, onSelect }: Props) {
  const isKo = locale === "ko";
  const [items, setItems] = useState<MediaItem[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage on mount
    setItems(getRecentlyViewed());
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="py-8">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-gold" />
        <h3 className="text-lg font-bold text-navy">
          {isKo ? "최근 본 매체" : "Recently Viewed"}
        </h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((media) => (
          <Card
            key={media.id}
            className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
            onClick={() => onSelect?.(media)}
          >
            <div className="flex h-24 items-center justify-center bg-gradient-to-br from-navy/5 to-navy/10">
              <Monitor className="h-8 w-8 text-navy/15" />
            </div>
            <CardHeader className="p-4 pb-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-navy/5 text-navy text-[10px]">
                  {isKo ? typeLabels[media.type]?.ko : typeLabels[media.type]?.en}
                </Badge>
              </div>
              <CardTitle className="text-sm">
                {isKo ? media.name : media.nameEn}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {isKo ? media.location : media.locationEn}
              </div>
              <div className="mt-1 text-sm font-bold text-navy">
                ₩{media.price.toLocaleString()}
                <span className="text-[10px] font-normal text-muted-foreground">만원</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
