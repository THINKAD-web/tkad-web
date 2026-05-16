const FETCH_TIMEOUT_MS = 12_000;

/** Remote image → data URL for jsPDF.addImage (JPEG/PNG). */
export async function fetchImageAsDataUrl(
  url: string,
): Promise<{ dataUrl: string; format: "JPEG" | "PNG" } | null> {
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(trimmed, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 32 || buf.length > 8 * 1024 * 1024) return null;

    const format: "JPEG" | "PNG" = ct.includes("png") ? "PNG" : "JPEG";
    const b64 = buf.toString("base64");
    const mime = format === "PNG" ? "image/png" : "image/jpeg";
    return { dataUrl: `data:${mime};base64,${b64}`, format };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
