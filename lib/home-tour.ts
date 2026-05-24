export const HOME_TOUR_OPEN_EVENT = "tkad-home-tour-open";

export function openHomeOnboardingTour() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(HOME_TOUR_OPEN_EVENT));
}
