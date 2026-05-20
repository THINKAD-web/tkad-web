const KEY_PREFIX = "tkad-proof-seen:";

export function proofSeenStorageKey(campaignId: string): string {
  return `${KEY_PREFIX}${campaignId}`;
}

export function readProofSeenAt(campaignId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(proofSeenStorageKey(campaignId));
  } catch {
    return null;
  }
}

export function writeProofSeenAt(campaignId: string, iso: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(proofSeenStorageKey(campaignId), iso);
  } catch {
    /* ignore quota */
  }
}

export function hasUnseenProofPhotos(
  latestProofAt: string | null | undefined,
  campaignId: string,
): boolean {
  if (!latestProofAt) return false;
  const seen = readProofSeenAt(campaignId);
  if (!seen) return true;
  return new Date(latestProofAt).getTime() > new Date(seen).getTime();
}
