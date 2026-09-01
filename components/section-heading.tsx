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
        <p className="mb-3 tkad-type-label text-accent">
          [ {eyebrow} ]
        </p>
      ) : null}
      <h2
        className={cn(
          "text-2xl font-bold tracking-normal text-foreground sm:text-3xl lg:text-[2.25rem] lg:leading-snug",
          titleClassName,
        )}
      >
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-sm leading-relaxed tracking-normal text-muted-foreground sm:text-base">
          {`// `}{subtitle}
        </p>
      ) : null}
    </div>
  );
}
