export interface PageHeroCompactProps {
  eyebrow?: string;
  title: string;
  highlight?: string;
  titleEnd?: string;
  description?: string;
}

/** 지도·탐색 등 작업 영역이 넓어야 하는 페이지용 축소 헤더 */
export function PageHeroCompact({
  eyebrow,
  title,
  highlight,
  titleEnd,
  description,
}: PageHeroCompactProps) {
  return (
    <div className="border-b border-gray-200/80 px-4 py-3 dark:border-white/10 md:py-3.5">
      {eyebrow ? (
        <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500 dark:text-white/45">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-lg font-bold leading-snug text-gray-900 dark:text-white md:text-xl">
        {title}
        {highlight ? (
          <span className="text-violet-600 dark:text-violet-300">{highlight}</span>
        ) : null}
        {titleEnd}
      </h1>
      {description ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-white/50 md:text-sm">
          {description}
        </p>
      ) : null}
    </div>
  );
}
