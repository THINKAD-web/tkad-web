import { mediaPriceExclNoteText } from "@/lib/media-price-format";
import { normalizeMediaDetailTextLocale } from "@/lib/media-i18n";
import { cn } from "@/lib/utils";

type Props = {
  locale?: string;
  /** @deprecated pass `locale` */
  isKo?: boolean;
  className?: string;
  /** 한 줄 메타(컴팩트 행)용 */
  inline?: boolean;
};

/** 매체·광고 단가 아래 — 제작비·부가세 별도 안내 */
export function MediaPriceExclNote({
  locale,
  isKo,
  className,
  inline = false,
}: Props) {
  const useKo =
    locale != null
      ? normalizeMediaDetailTextLocale(locale) === "ko"
      : (isKo ?? true);
  const text = mediaPriceExclNoteText(useKo);
  if (inline) {
    return (
      <span
        className={cn(
          "text-[10px] font-normal text-gray-600 dark:text-white/70",
          className,
        )}
      >
        {text}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "block text-[10px] leading-tight text-gray-600 dark:text-white/70",
        className,
      )}
    >
      {text}
    </span>
  );
}
