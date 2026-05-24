/** Time-based theme + manual override until next local midnight. */

export const THEME_STORAGE_KEY = "tkad-theme";
export const THEME_MANUAL_UNTIL_KEY = "tkad-theme-manual-until";

/** Blocking script — apply theme before first paint (manual override or hour-based auto). */
export const THEME_INIT_SCRIPT = `(function(){try{var h=new Date().getHours();var auto=(h>=18||h<6)?"dark":"light";var until=localStorage.getItem("${THEME_MANUAL_UNTIL_KEY}");var theme=auto;if(until&&Date.now()<Number(until)){var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")theme=t;}document.documentElement.classList.toggle("dark",theme==="dark");}catch(e){}})();`;

export type ThemeMode = "light" | "dark";

export function isDarkByHour(date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= 18 || hour < 6;
}

export function resolveAutoTheme(date = new Date()): ThemeMode {
  return isDarkByHour(date) ? "dark" : "light";
}

export function msUntilNextLocalMidnight(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}

function readManualUntilMs(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(THEME_MANUAL_UNTIL_KEY);
    if (!raw) return null;
    const untilMs = Number(raw);
    if (!Number.isFinite(untilMs)) {
      window.localStorage.removeItem(THEME_MANUAL_UNTIL_KEY);
      return null;
    }
    return untilMs;
  } catch {
    return null;
  }
}

/** Returns stored manual theme if override is still valid; otherwise null (auto mode). */
export function getManualTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  const untilMs = readManualUntilMs();
  if (untilMs == null || Date.now() >= untilMs) {
    clearManualTheme();
    return null;
  }
  try {
    const theme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (theme === "light" || theme === "dark") return theme;
    return null;
  } catch {
    return null;
  }
}

export function isAutoThemeMode(): boolean {
  return getManualTheme() === null;
}

export function clearManualTheme(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(THEME_MANUAL_UNTIL_KEY);
  } catch {
    /* ignore */
  }
}

export function setManualTheme(theme: ThemeMode, now = new Date()): void {
  if (typeof window === "undefined") return;
  const untilMs = now.getTime() + msUntilNextLocalMidnight(now);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.localStorage.setItem(THEME_MANUAL_UNTIL_KEY, String(untilMs));
  } catch {
    /* ignore */
  }
}

/** Clears expired manual override. Returns true when switched back to auto. */
export function clearExpiredManualTheme(now = new Date()): boolean {
  const untilMs = readManualUntilMs();
  if (untilMs == null) return false;
  if (now.getTime() < untilMs) return false;
  clearManualTheme();
  return true;
}

export function resolveEffectiveTheme(now = new Date()): ThemeMode {
  return getManualTheme() ?? resolveAutoTheme(now);
}

export const THEME_AUTO_CHANGED_EVENT = "tkad-theme-auto-changed";

export function dispatchThemeAutoChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(THEME_AUTO_CHANGED_EVENT));
}
