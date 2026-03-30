/**
 * 옥외 시뮬레이션: 매체 사진 위에 크리에이티브를 Canvas로 합성합니다.
 * (CSS mix-blend 대비 픽셀 단위 제어·PDF/캡처 연동에 유리)
 */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

export type CompositeSimulationOptions = {
  /** 크리에이티브 불투명도 0–1 */
  creativeAlpha?: number;
};

/**
 * 매체 이미지 + 광고 이미지를 합성한 PNG data URL을 반환합니다.
 */
export async function compositeCreativeOnMedia(
  mediaImageUrl: string,
  creativeImageUrl: string,
  width: number,
  height: number,
  options?: CompositeSimulationOptions,
): Promise<string> {
  const alpha = options?.creativeAlpha ?? 0.9;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");

  const [mediaImg, creativeImg] = await Promise.all([
    loadImage(mediaImageUrl),
    loadImage(creativeImageUrl),
  ]);

  ctx.drawImage(mediaImg, 0, 0, width, height);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.filter =
    "drop-shadow(0 8px 16px rgba(0,0,0,0.25)) brightness(1.05) contrast(1.02)";
  ctx.drawImage(creativeImg, 0, 0, width, height);
  ctx.restore();

  return canvas.toDataURL("image/png");
}
