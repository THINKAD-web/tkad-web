import type { ReactNode } from "react";

/** next-intl rich text: wrap `{accent}...{/accent}` segments */
export function accentTag(chunks: ReactNode) {
  return <span className="tkad-home-accent-text">{chunks}</span>;
}
