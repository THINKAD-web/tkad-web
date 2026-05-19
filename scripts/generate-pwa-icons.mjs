/**
 * public/icons/icon.svg → PNG (PWA·apple-touch-icon)
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");
const svgPath = join(iconsDir, "icon.svg");

mkdirSync(iconsDir, { recursive: true });
const svg = readFileSync(svgPath);

const sizes = [
  { name: "apple-touch-icon.png", size: 180 },
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
];

for (const { name, size } of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(join(iconsDir, name));
  console.log(`wrote public/icons/${name} (${size}x${size})`);
}
