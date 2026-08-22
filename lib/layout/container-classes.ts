/**
 * Page layout tokens — keep in sync with `app/ui-system.css` container utilities.
 * @see components/layout/page-container.tsx
 */

export const PAGE_CONTAINER_PADDING = "px-4 md:px-6 lg:px-8";

/** Bottom inset when mobile tab bar (incl. FAB) is visible — md+ unchanged */
export const MOBILE_CHROME_BOTTOM_PAD =
  "max-md:pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]";

export type PageContainerVariant = "wide" | "prose" | "fluid";

/** Wide uses `ui-container` CSS class (alias — zero drift from legacy markup). */
export const pageContainerClass: Record<PageContainerVariant, string> = {
  wide: "ui-container",
  prose: "ui-container-prose",
  fluid: "ui-container-fluid",
};
