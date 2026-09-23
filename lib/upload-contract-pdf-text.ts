import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import type { PdfTextRun } from "@/lib/upload-contract-stamp-anchor";

const require = createRequire(import.meta.url);

type PdfjsTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
};

type PdfjsPage = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  getTextContent: () => Promise<{ items: unknown[] }>;
};

type PdfjsDoc = {
  numPages: number;
  getPage: (n: number) => Promise<PdfjsPage>;
};

type PdfjsModule = {
  getDocument: (src: Record<string, unknown>) => { promise: Promise<PdfjsDoc> };
  GlobalWorkerOptions: { workerSrc: string };
};

/** 마지막 페이지 텍스트 런. 워커 없이 Node에서만 호출한다. */
export async function extractLastPageTextRuns(pdfBytes: Uint8Array): Promise<{
  page: { width: number; height: number };
  items: PdfTextRun[];
} | null> {
  try {
    const pdfjs = (await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    )) as PdfjsModule;
    const workerEntry = require.resolve(
      "pdfjs-dist/legacy/build/pdf.worker.mjs",
    );
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerEntry).href;
    const workerMod = (await import(pdfjs.GlobalWorkerOptions.workerSrc)) as {
      WorkerMessageHandler: unknown;
    };
    (globalThis as { pdfjsWorker?: { WorkerMessageHandler: unknown } }).pdfjsWorker =
      { WorkerMessageHandler: workerMod.WorkerMessageHandler };
    const doc = await pdfjs.getDocument({
      data: pdfBytes,
      disableWorker: true,
      verbosity: 0,
      isEvalSupported: false,
    }).promise;
    const page = await doc.getPage(doc.numPages);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items: PdfTextRun[] = [];
    for (const raw of content.items) {
      const item = raw as PdfjsTextItem;
      if (!item?.str || !item.transform) continue;
      items.push({
        str: item.str,
        x: item.transform[4] ?? 0,
        y: item.transform[5] ?? 0,
        width: item.width ?? 0,
        height: item.height ?? 0,
      });
    }
    return {
      page: { width: viewport.width, height: viewport.height },
      items,
    };
  } catch (e) {
    console.warn("[upload-contract-sign] text extract failed", e);
    return null;
  }
}
