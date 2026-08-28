import { fetchPublicMediaCatalogList } from "@/lib/public-media-catalog";
import { getPrimaryMediaImageUrl } from "@/lib/media-data";
import { siteUrl } from "@/lib/seo";

export type BrokenMediaImageRow = {
  mediaId: string;
  name: string;
  thumbnailUrl: string;
  status: number | null;
  error: string | null;
};

export type MediaImageHealthResult = {
  scanned: number;
  broken: BrokenMediaImageRow[];
  checkedAt: string;
};

const FETCH_TIMEOUT_MS = 12_000;
const BATCH_SIZE = 8;

function resolveAbsoluteThumbnailUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = siteUrl.replace(/\/$/, "");
  return trimmed.startsWith("/") ? `${base}${trimmed}` : `${base}/${trimmed}`;
}

async function probeImageUrl(
  url: string,
): Promise<{ ok: boolean; status: number | null; error: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
    });
    if (res.status === 405 || res.status === 501) {
      const getRes = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        cache: "no-store",
        headers: { Range: "bytes=0-0" },
      });
      const ok = getRes.ok && getRes.status < 400;
      return {
        ok,
        status: getRes.status,
        error: ok ? null : `HTTP ${getRes.status}`,
      };
    }
    const ok = res.ok && res.status < 400;
    return {
      ok,
      status: res.status,
      error: ok ? null : `HTTP ${res.status}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch_failed";
    return { ok: false, status: null, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

export async function scanBrokenMediaImages(): Promise<MediaImageHealthResult> {
  const catalog = await fetchPublicMediaCatalogList();
  const withThumb = catalog
    .map((m) => {
      const raw = getPrimaryMediaImageUrl(m);
      if (!raw) return null;
      return {
        mediaId: m.id,
        name: m.name,
        thumbnailUrl: resolveAbsoluteThumbnailUrl(raw),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  const broken: BrokenMediaImageRow[] = [];

  for (let i = 0; i < withThumb.length; i += BATCH_SIZE) {
    const batch = withThumb.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (row) => {
        const probe = await probeImageUrl(row.thumbnailUrl);
        return { row, probe };
      }),
    );
    for (const { row, probe } of results) {
      if (probe.ok) continue;
      const status = probe.status;
      const isBroken =
        status === 404 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        (status != null && status >= 400) ||
        probe.error != null;
      if (isBroken) {
        broken.push({
          mediaId: row.mediaId,
          name: row.name,
          thumbnailUrl: row.thumbnailUrl,
          status: probe.status,
          error: probe.error,
        });
      }
    }
  }

  return {
    scanned: withThumb.length,
    broken,
    checkedAt: new Date().toISOString(),
  };
}
