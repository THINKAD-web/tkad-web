/**
 * Map list hover — module-level store so `setHoveredId` does not re-render
 * `MediaMapPageClient` (control bar, filter chrome, etc.).
 * Map markers layer + list grid subscribe via `useSyncExternalStore`.
 */

let hoveredMediaId: string | null = null;
const listeners = new Set<() => void>();

export function getMapHoveredMediaId(): string | null {
  return hoveredMediaId;
}

export function subscribeMapHoveredMediaId(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setMapHoveredMediaId(id: string | null): void {
  if (hoveredMediaId === id) return;
  hoveredMediaId = id;
  for (const listener of listeners) listener();
}
