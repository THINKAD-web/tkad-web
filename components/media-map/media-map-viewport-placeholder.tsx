type Props = {
  locale: string;
};

/**
 * SSR map viewport backdrop — visible before Leaflet hydrates (PR-9).
 * Not an LCP gaming image: solid surface + spinner only.
 */
export function MediaMapViewportPlaceholder({ locale }: Props) {
  const isKo = locale === "ko" || locale.startsWith("ko");
  return (
    <div
      className="tkad-media-map-viewport-placeholder pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center gap-3 bg-gray-100 dark:bg-[#0a0a0a]"
      aria-hidden
    >
      <div
        className="size-9 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 dark:border-white/15 dark:border-t-white/80"
        role="presentation"
      />
      <p className="text-xs font-medium text-muted-foreground">
        {isKo ? "지도를 불러오는 중…" : "Loading map…"}
      </p>
    </div>
  );
}
