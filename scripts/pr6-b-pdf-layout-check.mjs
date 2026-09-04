#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const IN = join(root, "reports/pr6-b-copy-fix");
const OUT = join(IN, "layout-screenshots");

const htmlShell = (pdfB64) => `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<style>
body{margin:0;background:#eee}
.page{margin:16px auto;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.15)}
canvas{display:block}
</style></head><body><div id="root"></div>
<script>
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
(async()=>{
  const data=atob('${pdfB64}');
  const bytes=new Uint8Array(data.length);
  for(let i=0;i<data.length;i++) bytes[i]=data.charCodeAt(i);
  const pdf=await pdfjsLib.getDocument({data:bytes}).promise;
  window.__pageCount=pdf.numPages;
  const root=document.getElementById('root');
  for(let n=1;n<=pdf.numPages;n++){
    const page=await pdf.getPage(n);
    const vp=page.getViewport({scale:1.5});
    const canvas=document.createElement('canvas');
    canvas.width=vp.width; canvas.height=vp.height;
    canvas.className='page'; canvas.id='page-'+n;
    root.appendChild(canvas);
    await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
  }
})();
</script></body></html>`;

async function renderPdf(pdfName) {
  const bytes = readFileSync(join(IN, pdfName));
  const b64 = bytes.toString("base64");
  const htmlPath = join(OUT, `${pdfName}.render.html`);
  writeFileSync(htmlPath, htmlShell(b64));
  return htmlPath;
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 920, height: 1200 } });

  for (const pdf of ["only-online-report.pdf", "mixed-cart-report.pdf"]) {
    const htmlPath = await renderPdf(pdf);
    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForFunction(() => window.__pageCount > 0, { timeout: 120_000 });
    const count = await page.evaluate(() => window.__pageCount);
    const base = pdf.replace(/\.pdf$/, "");
    for (let i = 1; i <= count; i++) {
      const el = page.locator(`#page-${i}`);
      await el.scrollIntoViewIfNeeded();
      await el.screenshot({ path: join(OUT, `${base}-render-p${i}.png`) });
    }
    console.log(`[OK] ${pdf} → ${count} pages`);
  }
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
