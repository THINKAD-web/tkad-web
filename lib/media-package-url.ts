export function buildPackageContactHref(
  slug: string,
  name?: string,
): string {
  const q = new URLSearchParams();
  q.set("package", slug);
  if (name?.trim()) q.set("packageName", name.trim());
  return `/contact?${q.toString()}`;
}

export function buildPackageDetailHref(slug: string): string {
  return `/media/packages/${encodeURIComponent(slug)}`;
}
