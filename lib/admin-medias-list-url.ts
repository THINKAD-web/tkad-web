const DEFAULT_RECENT_TAKE = 500;
const SERVER_SEARCH_TAKE = 5000;

export function buildAdminMediasListUrl(opts?: {
  q?: string | null;
  cacheBust?: boolean;
}): string {
  const q = opts?.q?.trim() ?? "";
  const params = new URLSearchParams();
  if (q) {
    params.set("q", q);
    params.set("take", String(SERVER_SEARCH_TAKE));
  } else {
    params.set("take", String(DEFAULT_RECENT_TAKE));
  }
  if (opts?.cacheBust) {
    params.set("_", String(Date.now()));
  }
  return `/api/admin/medias?${params.toString()}`;
}

export { DEFAULT_RECENT_TAKE, SERVER_SEARCH_TAKE };
