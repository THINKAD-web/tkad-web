export interface PageHeroProps {
  eyebrow: string;
  title: string;
  highlight: string;
  titleEnd?: string;
  description: string;
}

export function PageHero({
  eyebrow,
  title,
  highlight,
  titleEnd,
  description,
}: PageHeroProps) {
  return (
    <div className="px-4 pt-6 pb-4">
      <p className="mb-2 text-xs tracking-widest uppercase text-cyan-600/60 dark:text-cyan-400/60">
        {eyebrow}
      </p>
      <h1 className="mb-2 text-3xl font-bold leading-tight text-gray-900 dark:text-white md:text-4xl">
        {title}
        <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          {highlight}
        </span>
        {titleEnd}
      </h1>
      <p className="text-sm text-gray-500 dark:text-white/50">{description}</p>
    </div>
  );
}
