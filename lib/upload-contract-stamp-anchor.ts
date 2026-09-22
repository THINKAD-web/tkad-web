/** PDF 사용자 공간(원점 좌하단) 텍스트 런 */
export type PdfTextRun = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PdfRect = { x: number; y: number; w: number; h: number };

/** 갑 (인) 위에 올릴 도장 한 변 (pt). 전화번호 행과 겹치지 않게 아래로 늘인다. */
export const UPLOAD_PARTY_A_SEAL_PT = 46;

/** 감사 텍스트 박스 상단. 도장·서명은 이 위로만 둔다. */
export const UPLOAD_AUDIT_TOP_PT = 112;

type TextLine = {
  y: number;
  x: number;
  width: number;
  text: string;
  runs: PdfTextRun[];
};

function clusterLines(items: PdfTextRun[]): TextLine[] {
  const sorted = items
    .filter((item) => item.str.trim().length > 0)
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const groups: PdfTextRun[][] = [];
  for (const item of sorted) {
    const group = groups.find((line) => {
      if (Math.abs(line[0]!.y - item.y) > 2.2) return false;
      const minX = Math.min(...line.map((run) => run.x));
      const maxX = Math.max(...line.map((run) => run.x + run.width));
      return item.x <= maxX + 36 && item.x + item.width >= minX - 36;
    });
    if (group) group.push(item);
    else groups.push([item]);
  }
  return groups.map((runs) => {
    runs.sort((a, b) => a.x - b.x);
    const x = runs[0]!.x;
    const end = Math.max(...runs.map((run) => run.x + run.width));
    const y = runs.reduce((sum, run) => sum + run.y, 0) / runs.length;
    return {
      y,
      x,
      width: end - x,
      text: runs.map((run) => run.str).join(""),
      runs,
    };
  });
}

function isPartyRepLine(line: TextLine): boolean {
  const text = line.text.replace(/\s/g, "");
  return text.includes("대표자") && text.includes("인)");
}

/**
 * 업로드 계약 마지막 페이지에서 갑 대표자 `(인)` 도장 칸.
 * 상단은 바로 위 행(전화번호) baseline 아래, 좌우는 갑 열 안.
 */
export function partyASealRect(
  page: { width: number; height: number },
  items: PdfTextRun[],
): PdfRect | null {
  const leftReps = clusterLines(items).filter(
    (line) => isPartyRepLine(line) && line.x < page.width * 0.5,
  );
  if (leftReps.length === 0) return null;

  const rep = leftReps.reduce((lowest, line) =>
    line.y < lowest.y ? line : lowest,
  );
  const lines = clusterLines(items);
  const phone = lines
    .filter(
      (line) =>
        line.x < page.width * 0.5 &&
        Math.abs(line.x - rep.x) < 40 &&
        line.y > rep.y + 4,
    )
    .sort((a, b) => a.y - b.y)[0];

  const inRun = [...rep.runs].reverse().find((run) => run.str.includes("인"));
  const centerX = inRun ? inRun.x + inRun.width / 2 : rep.x + rep.width - 6;
  const size = UPLOAD_PARTY_A_SEAL_PT;
  let x = centerX - size / 2;
  const rightLimit = page.width * 0.46;
  if (x + size > rightLimit) x = rightLimit - size;
  if (x < 28) x = 28;

  const phoneBaseline = phone?.y ?? rep.y + 22;
  const top = phoneBaseline - 3;
  let y = top - size;
  if (y < UPLOAD_AUDIT_TOP_PT + 8) y = UPLOAD_AUDIT_TOP_PT + 8;

  return { x, y, w: size, h: size };
}

const IMAGE_DRAW =
  /([0-9.]+) 0 0 ([0-9.]+) ([0-9.]+) ([0-9.]+) cm(\s*\/[^\s]+\s+Do)/g;

/**
 * 원본에 이미 찍힌 도장이 전화번호 행을 가리면, 그 행 baseline 아래로 내린다.
 * 축에 정렬된 `w 0 0 h x y cm /Image Do` 만 고친다.
 */
export function lowerSealMatrices(
  content: string,
  items: PdfTextRun[],
): string {
  const phones = clusterLines(items).filter((line) =>
    line.text.replace(/\s/g, "").includes("전화번호"),
  );
  return content.replace(IMAGE_DRAW, (full, wS, hS, xS, yS, tail) => {
    const w = Number(wS);
    const h = Number(hS);
    const x = Number(xS);
    const y = Number(yS);
    if (![w, h, x, y].every(Number.isFinite) || h < 20 || w < 20) return full;
    const phone = phones.find((line) => {
      const vertical =
        y < line.y + 2 && y + h > line.y - 2;
      const horizontal =
        x < line.x + line.width + 6 && x + w > line.x - 6;
      return vertical && horizontal;
    });
    if (!phone) return full;
    const maxTop = phone.y - 3;
    if (y + h <= maxTop + 0.4) return full;
    const newY = (maxTop - h).toFixed(2);
    return `${wS} 0 0 ${hS} ${xS} ${newY} cm${tail}`;
  });
}

/** 갑 도장 아래, 감사 기록 위. 페이지 우하단 구석에 두지 않는다. */
export function partyASignatureRect(seal: PdfRect): PdfRect {
  const h = 24;
  const w = 100;
  let y = seal.y - h - 8;
  if (y < UPLOAD_AUDIT_TOP_PT + 4) y = UPLOAD_AUDIT_TOP_PT + 4;
  return { x: 42, y, w, h };
}
