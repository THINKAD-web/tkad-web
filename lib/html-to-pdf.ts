import html2canvas from "html2canvas";
import type { jsPDF } from "jspdf";

/** Overall cap for html2canvas + jsPDF (image load + rasterize). */
export const HTML_TO_PDF_DEFAULT_TIMEOUT_MS = 30_000;

export type HtmlElementToPdfOptions = {
  /** 0 = no overall timeout. Default {@link HTML_TO_PDF_DEFAULT_TIMEOUT_MS}. */
  timeoutMs?: number;
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  if (ms <= 0) return promise;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * 외부 http(s) 이미지는 canvas 오염(CORS)을 유발할 수 있어 클론에서 플레이스홀더로 교체합니다.
 */
/**
 * Tailwind v4 등이 lab()/oklch()/lch()/oklab() 색 함수를 사용하면 html2canvas가
 * "Attempting to parse an unsupported color function 'lab'" 에러를 낸다.
 * onclone에서 다음 2단계 처리:
 * 1) 클론된 문서의 모든 element: computed color를 inline rgb로 강제 주입
 * 2) inline style에 남은 lab/oklch 표현은 rgb(0,0,0)로 치환 (최후 수단)
 */
function flattenModernColorsToInline(clonedDoc: Document, cloned: HTMLElement) {
  const COLOR_PROPS = [
    "color",
    "background-color",
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
    "outline-color",
    "fill",
    "stroke",
    "text-decoration-color",
  ];
  const win = clonedDoc.defaultView;
  if (!win) return;
  const all: HTMLElement[] = [cloned, ...Array.from(cloned.querySelectorAll<HTMLElement>("*"))];
  for (const el of all) {
    let cs: CSSStyleDeclaration;
    try {
      cs = win.getComputedStyle(el);
    } catch {
      continue;
    }
    for (const prop of COLOR_PROPS) {
      const val = cs.getPropertyValue(prop);
      if (!val) continue;
      // lab() / oklch() / lch() / oklab() / color-mix() / color() 등
      // 모던 CSS 색 함수가 그대로 남아있으면 html2canvas 가 파싱 실패한다.
      // computed 값에서도 일부 함수형이 잔존하는 환경이 있어 inline 으로 강제 변환.
      if (/(^|\s|,)(lab|oklch|lch|oklab|color-mix|color)\(/.test(val)) {
        // 가능한 한 RGB 로 변환을 시도 (Canvas 컨텍스트 fillStyle 활용).
        let rgb = "rgb(0,0,0)";
        try {
          if (typeof document !== "undefined") {
            const probe = document.createElement("canvas").getContext("2d");
            if (probe) {
              probe.fillStyle = val;
              const computed = probe.fillStyle;
              if (computed && /^(#[0-9a-f]{3,8}|rgba?\()/i.test(computed)) {
                rgb = computed;
              }
            }
          }
        } catch {
          /* ignore — fallback to black */
        }
        el.style.setProperty(prop, rgb);
      } else {
        el.style.setProperty(prop, val);
      }
    }
  }
}

function fixBackgroundClipTextForCapture(cloned: HTMLElement) {
  cloned.querySelectorAll<HTMLElement>(".tkad-home-accent-text").forEach((el) => {
    el.style.backgroundImage = "none";
    el.style.backgroundClip = "border-box";
    el.style.setProperty("-webkit-background-clip", "border-box");
    el.style.color = "#5b21b6";
    el.style.setProperty("-webkit-text-fill-color", "#5b21b6");
  });
}

function stripStylesheetsInClone(clonedDoc: Document) {
  clonedDoc.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    node.parentNode?.removeChild(node);
  });
}

function inlineComputedStylesForCapture(clonedDoc: Document, root: HTMLElement) {
  const win = clonedDoc.defaultView;
  if (!win) return;

  const PROPS = [
    "box-sizing",
    "display",
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "z-index",
    "float",
    "width",
    "height",
    "min-width",
    "min-height",
    "max-width",
    "max-height",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "border-top-width",
    "border-right-width",
    "border-bottom-width",
    "border-left-width",
    "border-top-style",
    "border-right-style",
    "border-bottom-style",
    "border-left-style",
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
    "border-radius",
    "flex",
    "flex-grow",
    "flex-shrink",
    "flex-basis",
    "flex-direction",
    "flex-wrap",
    "align-items",
    "align-self",
    "justify-content",
    "justify-items",
    "gap",
    "row-gap",
    "column-gap",
    "grid-template-columns",
    "grid-template-rows",
    "grid-column",
    "grid-row",
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "line-height",
    "letter-spacing",
    "text-align",
    "text-transform",
    "text-decoration-line",
    "white-space",
    "word-break",
    "vertical-align",
    "overflow",
    "overflow-x",
    "overflow-y",
    "object-fit",
    "object-position",
    "opacity",
    "visibility",
    "transform",
    "transform-origin",
    "background-color",
    "background-image",
    "background-size",
    "background-position",
    "background-repeat",
    "box-shadow",
    "table-layout",
    "border-collapse",
    "border-spacing",
    "list-style-type",
    "pointer-events",
    "color",
    "-webkit-text-fill-color",
  ] as const;

  const nodes: HTMLElement[] = [
    root,
    ...Array.from(root.querySelectorAll<HTMLElement>("*")),
  ];

  for (const el of nodes) {
    let cs: CSSStyleDeclaration;
    try {
      cs = win.getComputedStyle(el);
    } catch {
      continue;
    }
    for (const prop of PROPS) {
      try {
        const val = cs.getPropertyValue(prop);
        if (!val) continue;
        if (prop === "background-image" && val === "none") continue;
        el.style.setProperty(prop, val);
      } catch {
        /* ignore */
      }
    }
  }
}

function replaceUntrustedImagesInClone(clonedDoc: Document, cloned: HTMLElement) {
  try {
    flattenModernColorsToInline(clonedDoc, cloned);
    inlineComputedStylesForCapture(clonedDoc, cloned);
    fixBackgroundClipTextForCapture(cloned);
    // inline style에 남은 잔존 color 함수 치환
    cloned.querySelectorAll<HTMLElement>("*").forEach((el) => {
      const s = el.getAttribute("style");
      if (s && /(lab|oklch|lch|oklab|color-mix|color)\(/.test(s)) {
        el.setAttribute(
          "style",
          s.replace(
            /(lab|oklch|lch|oklab|color-mix|color)\([^)]+\)/g,
            "rgb(0,0,0)",
          ),
        );
      }
    });
    stripStylesheetsInClone(clonedDoc);
  } catch {
    /* ignore */
  }
  // onclone 훅은 동기. preloadImagesAsProxyDataUrls 가 사전에 외부 http(s) 이미지를
  // data URL 로 치환해 둔다. 여기서는 혹시 누락된 외부 이미지가 남아 있을 경우
  // 캔버스 오염을 방지하기 위한 안전망으로 placeholder 로 바꾼다 (same-origin / data
  // / blob 은 그대로 통과).
  cloned.querySelectorAll("img").forEach((node) => {
    const img = node as HTMLImageElement;
    const src = (img.getAttribute("src") ?? img.src ?? "").trim();
    if (!src || src.startsWith("data:") || src.startsWith("blob:")) {
      return;
    }
    try {
      const origin = clonedDoc.defaultView?.location?.origin;
      const u = new URL(src, clonedDoc.defaultView?.location?.href);
      if (origin && u.origin === origin) return;
    } catch {
      /* ignore */
    }
    const inTable = img.closest("td");
    const ph = clonedDoc.createElement("div");
    ph.setAttribute("aria-hidden", "true");
    if (inTable) {
      ph.style.width = "48px";
      ph.style.height = "48px";
    } else {
      ph.style.width = "112px";
      ph.style.height = "56px";
    }
    ph.style.background = "#e2e8f0";
    ph.style.borderRadius = "4px";
    ph.style.flexShrink = "0";
    img.replaceWith(ph);
  });
}

/**
 * 캡처 전에 element 내부의 외부 http(s) <img> 를 `/api/image-proxy` 경로로
 * 가져와 data URL 로 교체한다 — html2canvas 가 CORS 오염 없이 실제 이미지를
 * 캡처할 수 있게 함. 실패 시 원래 src 유지 (onclone 의 placeholder 안전망 작동).
 */
async function preloadImagesAsProxyDataUrls(element: HTMLElement): Promise<void> {
  if (typeof window === "undefined") return;
  const imgs = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = (img.getAttribute("src") ?? img.src ?? "").trim();
      if (!src || src.startsWith("data:") || src.startsWith("blob:")) return;
      if (src.startsWith("/api/image-proxy") || src.startsWith("/api/bunny-media/")) {
        return;
      }
      let u: URL;
      try {
        u = new URL(src, window.location.href);
      } catch {
        return;
      }
      if (u.origin === window.location.origin) return;
      if (u.protocol !== "http:" && u.protocol !== "https:") return;
      try {
        const proxied = `/api/image-proxy?url=${encodeURIComponent(u.toString())}`;
        const res = await fetch(proxied, { cache: "force-cache" });
        if (!res.ok) return;
        const blob = await res.blob();
        if (!blob.type.startsWith("image/")) return;
        const dataUrl: string = await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () =>
            resolve(typeof fr.result === "string" ? fr.result : "");
          fr.onerror = () => reject(fr.error ?? new Error("FileReader error"));
          fr.readAsDataURL(blob);
        });
        if (dataUrl) img.src = dataUrl;
      } catch {
        /* ignore */
      }
    }),
  );
}

async function waitForImagesInElement(element: HTMLElement): Promise<void> {
  const imgs = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }),
    ),
  );
}

async function waitForFontsAndPaint(): Promise<void> {
  if (typeof document === "undefined") return;
  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  } catch {
    /* ignore */
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * DOM 노드를 A4 세로 PDF로 래스터화 (한글은 스타일된 HTML 이미지로 보존).
 */
function resolveElementPdfBackground(element: HTMLElement): string {
  return (
    element.getAttribute("data-quote-pdf-background") ??
    element.dataset.quotePdfBackground ??
    "#ffffff"
  );
}

function isDarkPdfBackground(bg: string): boolean {
  return bg.trim().toLowerCase() !== "#ffffff";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const raw = hex.replace("#", "").trim();
  if (raw.length === 3) {
    return {
      r: parseInt(raw[0]! + raw[0], 16),
      g: parseInt(raw[1]! + raw[1], 16),
      b: parseInt(raw[2]! + raw[2], 16),
    };
  }
  if (raw.length >= 6) {
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
    };
  }
  return { r: 255, g: 255, b: 255 };
}

async function elementToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  await preloadImagesAsProxyDataUrls(element);
  await waitForImagesInElement(element);
  await waitForFontsAndPaint();

  const rect = element.getBoundingClientRect();
  const w = Math.max(1, Math.round(element.scrollWidth || rect.width));
  const h = Math.max(1, Math.round(element.scrollHeight || rect.height));
  const pdfBg = resolveElementPdfBackground(element);

  try {
    return await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: pdfBg,
      width: w,
      height: h,
      windowWidth: w,
      windowHeight: h,
      scrollX: 0,
      scrollY: -window.scrollY,
      imageTimeout: 20_000,
      onclone: replaceUntrustedImagesInClone,
    });
  } catch (e) {
    console.error("[html-to-pdf] html2canvas failed", {
      error: e instanceof Error ? e.message : String(e),
      size: { w, h },
      imgCount: element.querySelectorAll("img").length,
    });
    throw e;
  }
}

/** 한 요소를 A4 한 페이지에 맞춰 PDF에 추가 */
function addCanvasAsSingleA4Page(
  pdf: import("jspdf").jsPDF,
  canvas: HTMLCanvasElement,
  pdfBg: string,
  isFirstPage: boolean,
): void {
  if (!isFirstPage) {
    pdf.addPage();
  }

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const useDarkCapture = isDarkPdfBackground(pdfBg);
  const { r, g, b } = hexToRgb(pdfBg);
  pdf.setFillColor(r, g, b);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  const imgFormat = useDarkCapture ? "PNG" : "JPEG";
  const imgData = canvas.toDataURL(
    useDarkCapture ? "image/png" : "image/jpeg",
    useDarkCapture ? 1 : 0.92,
  );

  let drawW = pageWidth;
  let drawH = (canvas.height * pageWidth) / canvas.width;
  if (drawH > pageHeight) {
    drawH = pageHeight;
    drawW = (canvas.width * pageHeight) / canvas.height;
  }
  const offsetX = (pageWidth - drawW) / 2;
  const offsetY = (pageHeight - drawH) / 2;
  pdf.addImage(imgData, imgFormat, offsetX, offsetY, drawW, drawH);
}

async function htmlElementsToPdfInner(
  elements: HTMLElement[],
): Promise<import("jspdf").jsPDF> {
  if (typeof window === "undefined") {
    throw new Error("htmlElementsToPdf is browser-only");
  }
  if (elements.length === 0) {
    throw new Error("htmlElementsToPdf: no elements");
  }

  const { default: JsPDF } = await import("jspdf");
  const pdf = new JsPDF({ orientation: "p", unit: "mm", format: "a4" });

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]!;
    const canvas = await elementToCanvas(el);
    addCanvasAsSingleA4Page(
      pdf,
      canvas,
      resolveElementPdfBackground(el),
      i === 0,
    );
  }

  return pdf;
}

async function htmlElementToPdfInner(element: HTMLElement): Promise<jsPDF> {
  if (typeof window === "undefined") {
    throw new Error("htmlElementToPdf is browser-only");
  }

  const canvas = await elementToCanvas(element);
  const pdfBg = resolveElementPdfBackground(element);
  const useDarkCapture = isDarkPdfBackground(pdfBg);

  const { default: JsPDF } = await import("jspdf");
  const pdf = new JsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgFormat = useDarkCapture ? "PNG" : "JPEG";
  const imgData = canvas.toDataURL(
    useDarkCapture ? "image/png" : "image/jpeg",
    useDarkCapture ? 1 : 0.92,
  );
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * pageWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, imgFormat, 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, imgFormat, 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  return pdf;
}

export async function htmlElementToPdf(
  element: HTMLElement,
  options?: HtmlElementToPdfOptions,
): Promise<jsPDF> {
  const timeoutMs =
    options?.timeoutMs !== undefined
      ? options.timeoutMs
      : HTML_TO_PDF_DEFAULT_TIMEOUT_MS;
  const work = htmlElementToPdfInner(element);
  if (timeoutMs > 0) {
    return withTimeout(work, timeoutMs, "htmlElementToPdf");
  }
  return work;
}

/** 여러 DOM 블록을 각각 A4 1페이지로 PDF 병합 */
export async function htmlElementsToPdf(
  elements: HTMLElement[],
  options?: HtmlElementToPdfOptions,
): Promise<jsPDF> {
  const timeoutMs =
    options?.timeoutMs !== undefined
      ? options.timeoutMs
      : HTML_TO_PDF_DEFAULT_TIMEOUT_MS;
  const work = htmlElementsToPdfInner(elements);
  if (timeoutMs > 0) {
    return withTimeout(work, timeoutMs, "htmlElementsToPdf");
  }
  return work;
}

/** ASCII 안전 파일명 (플래너·견적 공통) */
export function defaultPlannerPdfFilename(): string {
  return `THINKAD-planner-report-${Date.now()}.pdf`;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function pdfToBlob(pdf: jsPDF): Blob {
  try {
    return pdf.output("blob");
  } catch (e) {
    console.error("[html-to-pdf] output blob failed, arraybuffer fallback", e);
    const ab = pdf.output("arraybuffer") as ArrayBuffer;
    return new Blob([ab], { type: "application/pdf" });
  }
}

/**
 * PDF 파일 다운로드 (FileSaver 우선, 실패 시 Blob 링크).
 */
async function savePdfDownload(pdf: jsPDF, filename: string): Promise<void> {
  const safeName =
    filename.replace(/[/\\?%*:|"<>]/g, "-").trim() ||
    `THINKAD-${Date.now()}.pdf`;
  try {
    const blob = pdfToBlob(pdf);
    triggerBlobDownload(blob, safeName);
  } catch (e) {
    console.error("[html-to-pdf] blob download failed, trying save()", e);
    try {
      pdf.save(safeName);
    } catch (e2) {
      console.error("[html-to-pdf] save() failed", e2);
      const blob = pdfToBlob(pdf);
      const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      triggerBlobDownload(blob, `THINKAD_export_${ymd}.pdf`);
    }
  }
}

export async function downloadPdfFromHtmlElement(
  element: HTMLElement,
  filename: string,
  options?: HtmlElementToPdfOptions,
): Promise<void> {
  const pdf = await htmlElementToPdf(element, options);
  await savePdfDownload(pdf, filename);
}

export async function downloadPdfFromHtmlElements(
  elements: HTMLElement[],
  filename: string,
  options?: HtmlElementToPdfOptions,
): Promise<void> {
  const pdf = await htmlElementsToPdf(elements, options);
  await savePdfDownload(pdf, filename);
}

/** 화면 캡처 → PNG 이미지로 다운로드 */
export async function captureElementAsPng(
  element: HTMLElement,
  filename = "THINKAD-capture.png",
): Promise<void> {
  await preloadImagesAsProxyDataUrls(element);
  await waitForImagesInElement(element);
  await waitForFontsAndPaint();
  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: "#ffffff",
    scrollX: 0,
    scrollY: -window.scrollY,
    imageTimeout: 20_000,
    onclone: replaceUntrustedImagesInClone,
  });
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png");
  });
  if (!blob) {
    throw new Error("captureElementAsPng: empty blob");
  }
  triggerBlobDownload(blob, filename);
}

export async function htmlElementToPdfBase64(
  element: HTMLElement,
  options?: HtmlElementToPdfOptions,
): Promise<string> {
  const pdf = await htmlElementToPdf(element, options);
  const uri = pdf.output("datauristring") as string;
  const i = uri.indexOf(",");
  return i >= 0 ? uri.slice(i + 1) : uri;
}

export async function htmlElementsToPdfBase64(
  elements: HTMLElement[],
  options?: HtmlElementToPdfOptions,
): Promise<string> {
  const pdf = await htmlElementsToPdf(elements, options);
  const uri = pdf.output("datauristring") as string;
  const i = uri.indexOf(",");
  return i >= 0 ? uri.slice(i + 1) : uri;
}
