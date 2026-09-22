import { CONTRACT_LAYOUT } from "@/lib/contract-layout";

export type KoSignatureSealRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type KoSignatureSealLayout = {
  sigBoxH: number;
  textBottomY: number;
  sealTopY: number;
  partyBStamp: KoSignatureSealRect;
  partyAStamp: KoSignatureSealRect;
  signature: KoSignatureSealRect;
};

/** 서명란 내 텍스트 4행 종료 y (drawSigFieldRow 누적값) */
export function koSignatureTextBottomY(
  boxTop: number,
  rowCount = 4,
): number {
  return boxTop + 9 + rowCount * CONTRACT_LAYOUT.sigFieldH;
}

/**
 * 갑·을 도장·서명 박스 — 텍스트 블록 아래 전용 띠 (겹침 방지).
 * 좌표는 jsPDF mm, 원점 좌상단.
 */
export function computeKoSignatureSealLayout(input: {
  boxTop: number;
  leftX: number;
  rightX: number;
  colW: number;
  ly: number;
  ry: number;
  hasClientStamp: boolean;
}): KoSignatureSealLayout {
  const stampSize = CONTRACT_LAYOUT.sigStampMm;
  const inset = CONTRACT_LAYOUT.sigStampInsetMm;
  const textBottomY = Math.max(input.ly, input.ry);
  const sealGap = 3;
  const sealTopY = textBottomY + sealGap;
  const sigBoxH = sealTopY - input.boxTop + stampSize + 4;

  const partyBStamp: KoSignatureSealRect = {
    x: input.rightX + input.colW - inset - stampSize,
    y: sealTopY,
    w: stampSize,
    h: stampSize,
  };

  const partyAStamp: KoSignatureSealRect = {
    x: input.leftX + input.colW - inset - stampSize,
    y: sealTopY,
    w: stampSize,
    h: stampSize,
  };

  const sigH = 14;
  const sigW = Math.min(
    input.colW - inset - stampSize - 10,
    42,
  );
  const sigX = input.hasClientStamp
    ? partyAStamp.x - sigW - 3
    : input.leftX + input.colW - inset - sigW;
  const signature: KoSignatureSealRect = {
    x: sigX,
    y: sealTopY + (stampSize - sigH) / 2,
    w: sigW,
    h: sigH,
  };

  return {
    sigBoxH,
    textBottomY,
    sealTopY,
    partyBStamp,
    partyAStamp,
    signature,
  };
}

/** 도장 상단이 대표자 행 baseline 아래에 있어야 함 */
export function sealsClearOfTextRows(layout: KoSignatureSealLayout): boolean {
  const repRowBaseline =
    layout.textBottomY - CONTRACT_LAYOUT.sigFieldH / 2;
  return layout.sealTopY >= repRowBaseline + 2;
}
