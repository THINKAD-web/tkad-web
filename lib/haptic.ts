const DURATION_LIGHT = 50;
const DURATION_SUCCESS = [30, 40, 30] as const;

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate?.(pattern);
  }
}

/** Tab tap, sheet open, minor UI feedback */
export function hapticLight() {
  vibrate(DURATION_LIGHT);
}

/** Like, favorite toggle */
export function hapticMedium() {
  vibrate(DURATION_LIGHT);
}

/** Payment complete, major success */
export function hapticSuccess() {
  vibrate([...DURATION_SUCCESS]);
}

/** Push / in-app notification arrival */
export function hapticNotification() {
  vibrate([20, 60, 20]);
}
