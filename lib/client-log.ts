/**
 * Client-side diagnostic logger.
 *
 * In development it forwards to console.* so DevTools still shows context.
 * In production it drops the call — avoids leaking internal error shapes
 * (stack traces, schema detail, API tokens in responses) into the
 * browser console where anyone can open DevTools and read them.
 */
const isDev = process.env.NODE_ENV !== "production";

export function logClientError(...args: unknown[]): void {
  if (isDev) console.error(...args);
}

export function logClientWarn(...args: unknown[]): void {
  if (isDev) console.warn(...args);
}
