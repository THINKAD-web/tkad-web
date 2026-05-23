export function hapticLight() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(50);
  }
}
