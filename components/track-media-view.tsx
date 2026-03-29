"use client";

import { useEffect } from "react";
import { addRecentlyViewedId } from "@/lib/recently-viewed";

export default function TrackMediaView({ mediaId }: { mediaId: string }) {
  useEffect(() => {
    addRecentlyViewedId(mediaId);
  }, [mediaId]);
  return null;
}
