const OPEN_MS = 30_000;
const FAILURE_THRESHOLD = 3;

let consecutive503 = 0;
let openUntil = 0;

export function isDigitalMixCircuitOpen(): boolean {
  return Date.now() < openUntil;
}

export function recordDigitalMixSuccess(): void {
  consecutive503 = 0;
}

/** Returns true when circuit just opened. */
export function recordDigitalMixFailure(status: number | null): boolean {
  if (status === 503 || status === null) {
    consecutive503 += 1;
    if (consecutive503 >= FAILURE_THRESHOLD) {
      openUntil = Date.now() + OPEN_MS;
      consecutive503 = 0;
      return true;
    }
    return false;
  }
  if (status >= 400 && status < 500) {
    consecutive503 = 0;
  }
  return false;
}

/** Test helper — reset module state. */
export function resetDigitalMixCircuitForTests(): void {
  consecutive503 = 0;
  openUntil = 0;
}

export function digitalMixCircuitOpenUntilForTests(): number {
  return openUntil;
}
