export type OohQuoteRecalcErrorCode =
  | "recalc_custom_only"
  | "recalc_no_media";

export class OohQuoteRecalcError extends Error {
  readonly code: OohQuoteRecalcErrorCode;

  constructor(code: OohQuoteRecalcErrorCode, message: string) {
    super(message);
    this.name = "OohQuoteRecalcError";
    this.code = code;
  }
}

export function isOohQuoteRecalcError(e: unknown): e is OohQuoteRecalcError {
  return e instanceof OohQuoteRecalcError;
}

export function mapOohQuoteRecalcApiError(
  errorCode: string | undefined,
  messages: {
    recalcCustomOnly: string;
    recalcNoMedia: string;
    fallback: string;
  },
): string {
  switch (errorCode) {
    case "recalc_custom_only":
      return messages.recalcCustomOnly;
    case "recalc_no_media":
      return messages.recalcNoMedia;
    default:
      return errorCode?.trim() ? errorCode : messages.fallback;
  }
}
