import { mediaPriceExclNoteText } from "@/lib/media-price-format";
import { cn } from "@/lib/utils";

type Props = {
  isKo?: boolean;
  className?: string;
  /** 한 줄 메타(컴팩트 행)용 */
  inline?: boolean;
};

/** 매체·광고 단가 아래 — 제작비·부가세 별도 안내 */
export function MediaPriceExclNote({
  isKo = true,
  className,
  inline = false,
}: Props) {
  const text = mediaPriceExclNoteText(isKo);
  if (inline) {
    return (
      <span
        className={cn(
          "text-[10px] font-normal text-gray-400 dark:text-white/45",
          className,
        )}
      >
        {text}
      </span>
    );
  }
  return (
    <p
      className={cn(
        "text-[10px] leading-tight text-gray-400 dark:text-white/45",
        className,
      )}
    >
      {text}
    </p>
  );
}
