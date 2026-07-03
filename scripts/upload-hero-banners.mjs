#!/usr/bin/env node
/**
 * Upload public/images/hero/*-828.webp to Bunny Storage (same filenames).
 * Requires BUNNY_STORAGE_ZONE, BUNNY_STORAGE_API_KEY, BUNNY_CDN_BASE_URL.
 *
 * Usage: node scripts/upload-hero-banners.mjs
 * After upload, switch SLIDES in home-hero-banner.tsx to CDN URLs if desired.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const heroDir = path.join(root, "public", "images", "hero");

const zone = process.env.BUNNY_STORAGE_ZONE?.trim();
const key = process.env.BUNNY_STORAGE_API_KEY?.trim();
const cdnBase = process.env.BUNNY_CDN_BASE_URL?.trim();

if (!zone || !key || !cdnBase) {
  console.error("Missing BUNNY_STORAGE_ZONE, BUNNY_STORAGE_API_KEY, or BUNNY_CDN_BASE_URL");
  process.exit(1);
}

const host =
  process.env.BUNNY_STORAGE_HOST?.trim() || "https://storage.bunnycdn.com";

async function upload(fileName) {
  const localPath = path.join(heroDir, fileName);
  if (!fs.existsSync(localPath)) {
    throw new Error(`Missing ${localPath}`);
  }
  const body = fs.readFileSync(localPath);
  const url = `${host.replace(/\/+$/, "")}/${encodeURIComponent(zone)}/${fileName}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      AccessKey: key,
      "Content-Type": "image/webp",
    },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Upload ${fileName} failed: ${res.status} ${t.slice(0, 200)}`);
  }
  const publicUrl = `${cdnBase.replace(/\/+$/, "")}/${fileName}`;
  console.log(`OK ${fileName} → ${publicUrl}`);
}

for (const name of ["hero-slide1-828.webp", "hero-slide2-828.webp"]) {
  await upload(name);
}
