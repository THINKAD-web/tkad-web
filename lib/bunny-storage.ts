function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${b}/${p}`;
}

function bunnyStorageBaseUrl(): string {
  // Bunny Storage API default host
  const host =
    process.env.BUNNY_STORAGE_HOST?.trim() || "https://storage.bunnycdn.com";
  return host.replace(/\/+$/, "");
}

export type BunnyStorageConfigStatus = {
  configured: boolean;
  missingEnvVars: string[];
};

export function getBunnyStorageConfigStatus(): BunnyStorageConfigStatus {
  const missingEnvVars: string[] = [];
  if (!process.env.BUNNY_STORAGE_ZONE?.trim()) {
    missingEnvVars.push("BUNNY_STORAGE_ZONE");
  }
  if (!process.env.BUNNY_STORAGE_API_KEY?.trim()) {
    missingEnvVars.push("BUNNY_STORAGE_API_KEY");
  }
  if (!process.env.BUNNY_CDN_BASE_URL?.trim()) {
    missingEnvVars.push("BUNNY_CDN_BASE_URL");
  }
  return {
    configured: missingEnvVars.length === 0,
    missingEnvVars,
  };
}

export function isBunnyStorageConfigured(): boolean {
  return getBunnyStorageConfigStatus().configured;
}

export type BunnyUploadResult = {
  publicUrl: string;
  path: string;
};

export async function uploadToBunnyStorage(opts: {
  path: string; // path inside the storage zone
  bytes: ArrayBuffer;
  contentType?: string;
}): Promise<BunnyUploadResult> {
  const zone = process.env.BUNNY_STORAGE_ZONE?.trim();
  const key = process.env.BUNNY_STORAGE_API_KEY?.trim();
  const cdnBase = process.env.BUNNY_CDN_BASE_URL?.trim();
  if (!zone || !key || !cdnBase) {
    throw new Error("BUNNY_STORAGE_NOT_CONFIGURED");
  }

  const normalizedPath = opts.path.replace(/^\/+/, "");
  const putUrl = `${bunnyStorageBaseUrl()}/${encodeURIComponent(zone)}/${normalizedPath}`;

  const res = await fetch(putUrl, {
    method: "PUT",
    headers: {
      AccessKey: key,
      "Content-Type": opts.contentType || "application/octet-stream",
    },
    body: Buffer.from(opts.bytes),
    // Bunny is an external API; never cache.
    cache: "no-store",
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`BUNNY_UPLOAD_FAILED:${res.status}:${t.slice(0, 200)}`);
  }

  return {
    path: normalizedPath,
    publicUrl: joinUrl(cdnBase, normalizedPath),
  };
}

