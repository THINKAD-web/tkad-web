/** 내부 라우트 `<a>` 클릭인지 — TopLoader 전환 시작 감지용 */
export function isInternalNavigationClick(
  anchor: Element | null,
  event: MouseEvent,
): anchor is HTMLAnchorElement {
  if (!anchor || !(anchor instanceof HTMLAnchorElement)) return false;
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;

  const rawHref = anchor.getAttribute("href");
  if (
    !rawHref ||
    rawHref.startsWith("#") ||
    rawHref.startsWith("mailto:") ||
    rawHref.startsWith("tel:")
  ) {
    return false;
  }

  try {
    const url = new URL(anchor.href, window.location.href);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

export function pathnameFromHref(href: string): string {
  try {
    return new URL(href, window.location.href).pathname;
  } catch {
    return href;
  }
}
