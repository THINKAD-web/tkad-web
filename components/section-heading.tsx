import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  align?: "center" | "left";
  className?: string;
  /** 제목 크기 강조 */
  titleClassName?: string;
};

export function SectionHeading({
  title,
  subtitle,
  eyebrow,
  align = "center",
  className,
  titleClassName,
}: Props) {
  return (
    <div
      className={cn(
        align === "center" && "mx-auto text-center",
        "max-w-3xl",
        className,
      )}
    >
      {eyebrow ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold">
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          "text-2xl font-bold tracking-tight text-navy sm:text-3xl lg:text-[2rem] lg:leading-snug",
          titleClassName,
        )}
      >
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
