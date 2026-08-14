/** Preserve first-seen order; trim; drop empties/duplicates. */
export function dedupeUrlsPreserveOrder(urls: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    const u = raw.trim();
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

/** Merge cover + gallery into one ordered unique list (cover first when set). */
export function mergePrimaryAndExtracted(
  image: string | null | undefined,
  extracted: string[] | null | undefined,
): string[] {
  const primary = image?.trim() ?? "";
  return dedupeUrlsPreserveOrder([
    ...(primary ? [primary] : []),
    ...(extracted ?? []),
  ]);
}

/** Split ordered gallery into Media.image + Media.extractedImages. */
export function splitPrimaryAndExtracted(urls: string[]): {
  image: string | null;
  extractedImages: string[];
} {
  const merged = dedupeUrlsPreserveOrder(urls);
  if (merged.length === 0) return { image: null, extractedImages: [] };
  return { image: merged[0]!, extractedImages: merged.slice(1) };
}

export function galleryUrlsFromFormParts(
  image: string,
  extractedImagesText: string,
): string[] {
  const gallery = extractedImagesText
    .trim()
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const primary = image.trim();
  if (primary) return dedupeUrlsPreserveOrder([primary, ...gallery]);
  return dedupeUrlsPreserveOrder(gallery);
}

export function applyGalleryUrlsToFormParts(urls: string[]): {
  image: string;
  extractedImagesText: string;
} {
  const { image, extractedImages } = splitPrimaryAndExtracted(urls);
  return {
    image: image ?? "",
    extractedImagesText: extractedImages.join("\n"),
  };
}

/**
 * Save payload for image fields: primary stays in `image`, extras in extracted.
 * Never drops a unique URL that appears in either field.
 */
export function imageFieldsForApiBody(
  image: string,
  extractedImagesText: string,
): { image: string | null; extractedImages: string[] } {
  return splitPrimaryAndExtracted(
    galleryUrlsFromFormParts(image, extractedImagesText),
  );
}

/** Admin form gallery snapshot for "touched" detection on PATCH omit. */
export type GalleryFormSnapshot = {
  image: string;
  extractedImagesText: string;
};

export function galleryFormSnapshot(
  image: string,
  extractedImagesText: string,
): GalleryFormSnapshot {
  return { image, extractedImagesText };
}

/** `initial === null` → new media POST; always send gallery fields. */
export function galleryFormSnapshotTouched(
  current: GalleryFormSnapshot,
  initial: GalleryFormSnapshot | null,
): boolean {
  if (initial === null) return true;
  return (
    current.image !== initial.image ||
    current.extractedImagesText !== initial.extractedImagesText
  );
}
